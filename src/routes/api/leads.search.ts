// Server route: POST /api/leads/search
// Real provider: OpenStreetMap Overpass API (free, no API key).
// Strategy:
//   1. Geocode city via Nominatim → bounding box.
//   2. Query Overpass for nodes/ways/relations matching the niche inside bbox,
//      pulling rich contact tags (phone, website, email, social).
//   3. Normalize, dedup, filter (must have phone OR website), sort, enrich.
//   4. Falls back to Nominatim plain search, then to mock demo data.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { enrichLeads } from "@/lib/leads/scoring";
import { buildMockRawLeads } from "@/lib/leads/providers/mock";
import {
  hasMinContact,
  mergeRawLeads,
  completenessScore,
} from "@/lib/leads/normalize";
import type { Lead, LeadSearchResult, RawLead } from "@/lib/leads/types";

const InputSchema = z.object({
  niche: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  country: z.string().min(1).max(80),
  limit: z.number().int().min(1).max(40).optional(),
});

const UA = "NexloftDigital/1.0 (lead-intel; contact: hello@nexloftdigital.com)";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; result: LeadSearchResult }>();
function cacheKey(input: z.infer<typeof InputSchema>) {
  return `${input.niche.toLowerCase().trim()}|${input.city.toLowerCase().trim()}|${input.country.toLowerCase().trim()}|${input.limit ?? 12}`;
}

// ---------- Niche → Overpass tag mapping ----------

interface OverpassTagFilter {
  // Each entry produces one Overpass tag filter, e.g. ["amenity","dentist"].
  key: string;
  value: string;
}

const NICHE_TAGS: Record<string, OverpassTagFilter[]> = {
  dentist: [{ key: "amenity", value: "dentist" }, { key: "healthcare", value: "dentist" }],
  hospital: [{ key: "amenity", value: "hospital" }, { key: "healthcare", value: "hospital" }],
  clinic: [{ key: "amenity", value: "clinic" }, { key: "healthcare", value: "clinic" }],
  pharmacy: [{ key: "amenity", value: "pharmacy" }, { key: "healthcare", value: "pharmacy" }],
  doctor: [{ key: "amenity", value: "doctors" }, { key: "healthcare", value: "doctor" }],
  hotel: [{ key: "tourism", value: "hotel" }, { key: "tourism", value: "guest_house" }, { key: "tourism", value: "hostel" }],
  lodge: [{ key: "tourism", value: "hotel" }, { key: "tourism", value: "guest_house" }],
  resort: [{ key: "tourism", value: "hotel" }],
  restaurant: [{ key: "amenity", value: "restaurant" }, { key: "amenity", value: "fast_food" }],
  cafe: [{ key: "amenity", value: "cafe" }],
  bar: [{ key: "amenity", value: "bar" }, { key: "amenity", value: "pub" }],
  salon: [{ key: "shop", value: "hairdresser" }, { key: "shop", value: "beauty" }],
  spa: [{ key: "leisure", value: "spa" }, { key: "shop", value: "beauty" }],
  lawyer: [{ key: "office", value: "lawyer" }],
  church: [{ key: "amenity", value: "place_of_worship" }],
  school: [{ key: "amenity", value: "school" }, { key: "amenity", value: "college" }],
  boutique: [{ key: "shop", value: "clothes" }, { key: "shop", value: "boutique" }],
  gym: [{ key: "leisure", value: "fitness_centre" }, { key: "sport", value: "fitness" }],
  bank: [{ key: "amenity", value: "bank" }],
  car: [{ key: "shop", value: "car" }, { key: "shop", value: "car_repair" }],
};

function tagsForNiche(niche: string): OverpassTagFilter[] {
  const key = niche.toLowerCase().trim();
  if (NICHE_TAGS[key]) return NICHE_TAGS[key];
  for (const [k, v] of Object.entries(NICHE_TAGS)) {
    if (key.includes(k)) return v;
  }
  // Fallback: search by name. Overpass supports name regex.
  return [];
}

// ---------- Nominatim geocoding (city → bbox) ----------

interface NominatimCity {
  boundingbox?: [string, string, string, string]; // [south, north, west, east]
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodeCity(city: string, country: string): Promise<{
  bbox: [number, number, number, number]; // [south, west, north, east] for Overpass
  display: string;
} | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${city}, ${country}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimCity[];
  const c = data[0];
  if (!c?.boundingbox) {
    if (c?.lat && c?.lon) {
      // ~30km square around the point as fallback.
      const lat = parseFloat(c.lat);
      const lon = parseFloat(c.lon);
      const d = 0.27;
      return { bbox: [lat - d, lon - d, lat + d, lon + d], display: c.display_name };
    }
    return null;
  }
  const [south, north, west, east] = c.boundingbox.map(parseFloat) as [
    number,
    number,
    number,
    number,
  ];
  return { bbox: [south, west, north, east], display: c.display_name };
}

// ---------- Overpass query ----------

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function buildOverpassQuery(
  filters: OverpassTagFilter[],
  bbox: [number, number, number, number],
  nameFallback: string,
): string {
  const bboxStr = bbox.join(",");
  const blocks: string[] = [];
  for (const f of filters) {
    blocks.push(`node["${f.key}"="${f.value}"](${bboxStr});`);
    blocks.push(`way["${f.key}"="${f.value}"](${bboxStr});`);
  }
  // If no specific filter, do a name-based search.
  if (filters.length === 0) {
    const safe = nameFallback.replace(/["\\]/g, "");
    blocks.push(`node["name"~"${safe}",i](${bboxStr});`);
    blocks.push(`way["name"~"${safe}",i](${bboxStr});`);
  }
  return `[out:json][timeout:25];(${blocks.join("")});out tags center 60;`;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchOverpass(query: string): Promise<OverpassResponse | null> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Accept: "application/json",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as OverpassResponse;
      return json;
    } catch (e) {
      console.warn(`[overpass] ${endpoint} failed:`, (e as Error).message);
    }
  }
  return null;
}

function elementToRaw(
  el: OverpassElement,
  input: z.infer<typeof InputSchema>,
): RawLead | null {
  const tags = el.tags ?? {};
  const name = tags.name || tags["name:en"] || tags.brand;
  if (!name) return null;
  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;

  const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"] || null;
  const website = tags.website || tags["contact:website"] || tags.url || null;
  const email = tags.email || tags["contact:email"] || null;
  const instagram =
    tags["contact:instagram"] || tags.instagram || tags["brand:instagram"] || null;
  const facebook =
    tags["contact:facebook"] || tags.facebook || tags["brand:facebook"] || null;

  const addressBits = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:suburb"],
    tags["addr:city"] || tags["addr:town"] || input.city,
    tags["addr:state"],
  ].filter(Boolean);
  const address = addressBits.length ? addressBits.join(", ") : null;

  const cityName = tags["addr:city"] || tags["addr:town"] || input.city;
  const locationType =
    tags.amenity || tags.shop || tags.tourism || tags.healthcare || tags.office || tags.leisure || null;

  return {
    business_name: name,
    niche: input.niche,
    city: cityName,
    country: input.country,
    phone,
    email,
    website,
    instagram,
    facebook,
    reviews_estimate: 0,
    source_id: `osm_${el.type}_${el.id}`,
    source: "openstreetmap",
    address,
    location_type: locationType,
    lat,
    lon,
  };
}

// ---------- Sorting ----------

function sortLeads(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    // 1. Has phone first
    const ap = a.phone ? 1 : 0;
    const bp = b.phone ? 1 : 0;
    if (ap !== bp) return bp - ap;
    // 2. Has website
    const aw = a.website ? 1 : 0;
    const bw = b.website ? 1 : 0;
    if (aw !== bw) return bw - aw;
    // 3. Higher lead score
    return b.lead_score - a.lead_score;
  });
}

// ---------- Main search ----------

async function searchOverpass(
  input: z.infer<typeof InputSchema>,
): Promise<{ raws: RawLead[]; stage: string } | null> {
  const limit = input.limit ?? 12;
  const geo = await geocodeCity(input.city, input.country);
  if (!geo) return null;

  const filters = tagsForNiche(input.niche);
  const query = buildOverpassQuery(filters, geo.bbox, input.niche);
  const data = await fetchOverpass(query);
  if (!data) return null;

  const raws: RawLead[] = [];
  for (const el of data.elements) {
    const r = elementToRaw(el, input);
    if (r) raws.push(r);
  }

  // Dedup and quality-filter happens on the merged set.
  const merged = mergeRawLeads(raws);
  const filtered = merged
    .filter(hasMinContact)
    .sort((a, b) => completenessScore(b) - completenessScore(a))
    .slice(0, Math.max(limit, 12));

  return { raws: filtered, stage: filtered.length ? "ok" : "empty" };
}

export const Route = createFileRoute("/api/leads/search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }
        const parsed = InputSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: "Invalid input", details: parsed.error.flatten() },
            400,
          );
        }
        const input = parsed.data;

        const key = cacheKey(input);
        const cached = cache.get(key);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
          return jsonResponse(cached.result);
        }

        try {
          const overpass = await searchOverpass(input);
          if (overpass && overpass.raws.length > 0) {
            const leads = sortLeads(enrichLeads(overpass.raws));
            const result: LeadSearchResult = {
              leads,
              source: "openstreetmap",
              isDemo: false,
              notice: undefined,
            };
            cache.set(key, { at: Date.now(), result });
            return jsonResponse(result);
          }

          // No real results — return demo, but be honest about it.
          const result: LeadSearchResult = {
            leads: sortLeads(enrichLeads(buildMockRawLeads(input))),
            source: "mock",
            isDemo: true,
            notice:
              "No contactable businesses found in OpenStreetMap for that niche + city. Showing demo data.",
          };
          cache.set(key, { at: Date.now(), result });
          return jsonResponse(result);
        } catch (e) {
          const err = e as Error & { status?: number };
          console.error("[/api/leads/search] error:", err.message);
          const result: LeadSearchResult = {
            leads: sortLeads(enrichLeads(buildMockRawLeads(input))),
            source: "mock",
            isDemo: true,
            notice:
              err.status === 429
                ? "OpenStreetMap rate limit reached — showing demo data."
                : "Couldn't reach OpenStreetMap — showing demo data.",
          };
          return jsonResponse(result);
        }
      },
    },
  },
});
