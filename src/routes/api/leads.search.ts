// Server route: POST /api/leads/search
// Real provider: OpenStreetMap Nominatim (free, no API key).
// - Sends required User-Agent header (Nominatim usage policy).
// - In-memory cache (5 min) for instant repeat searches.
// - Falls back to mock with isDemo:true on Nominatim errors.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { enrichLeads } from "@/lib/leads/scoring";
import { buildMockRawLeads } from "@/lib/leads/providers/mock";
import type { LeadSearchResult, RawLead } from "@/lib/leads/types";

const InputSchema = z.object({
  niche: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  country: z.string().min(1).max(80),
  limit: z.number().int().min(1).max(40).optional(),
});

interface NominatimResult {
  place_id: number;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  lat: string;
  lon: string;
  address?: {
    amenity?: string;
    shop?: string;
    office?: string;
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

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

function formatAddress(r: NominatimResult): string {
  const a = r.address ?? {};
  const parts = [
    [a.house_number, a.road].filter(Boolean).join(" "),
    a.suburb,
    a.city ?? a.town ?? a.village,
    a.state,
    a.country,
  ].filter((p): p is string => !!p && p.length > 0);
  return parts.length ? parts.join(", ") : r.display_name;
}

function businessNameFor(r: NominatimResult, fallbackNiche: string): string {
  if (r.name && r.name.trim().length > 0) return r.name;
  const a = r.address ?? {};
  return a.amenity ?? a.shop ?? a.office ?? r.display_name.split(",")[0] ?? fallbackNiche;
}

async function searchNominatim(
  input: z.infer<typeof InputSchema>,
): Promise<RawLead[]> {
  const limit = input.limit ?? 12;
  const q = `${input.niche} ${input.city} ${input.country}`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(Math.max(10, limit)));

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "NexloftDigital/1.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Nominatim ${res.status}: ${text.slice(0, 300)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const data = (await res.json()) as NominatimResult[];

  return data.slice(0, limit).map((r) => {
    const business_name = businessNameFor(r, input.niche);
    const a = r.address ?? {};
    const cityName = a.city ?? a.town ?? a.village ?? input.city;
    const countryName = a.country ?? input.country;
    return {
      business_name,
      niche: input.niche,
      city: cityName,
      country: countryName,
      phone: null,
      email: null,
      website: null,
      instagram: null,
      facebook: null,
      reviews_estimate: 0,
      source_id: String(r.place_id),
      source: "openstreetmap",
      // Stash address + type for the UI via business_name fallback isn't great;
      // we put address in a side-channel by appending below in enrichment.
      // (Keeps RawLead shape unchanged.)
      _address: formatAddress(r),
      _location_type: r.type ?? r.class ?? null,
    } as RawLead & { _address: string; _location_type: string | null };
  });
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
          const raws = await searchNominatim(input);
          const result: LeadSearchResult = {
            leads: enrichLeads(raws),
            source: "openstreetmap",
            isDemo: false,
            notice:
              raws.length === 0
                ? "No results from OpenStreetMap for that niche + city."
                : undefined,
          };
          cache.set(key, { at: Date.now(), result });
          return jsonResponse(result);
        } catch (e) {
          const err = e as Error & { status?: number };
          console.error("[/api/leads/search] Nominatim error:", err.message);
          // Graceful fallback to demo mode so the app stays usable.
          const result: LeadSearchResult = {
            leads: enrichLeads(buildMockRawLeads(input)),
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
