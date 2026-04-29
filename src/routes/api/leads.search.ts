// Server route: POST /api/leads/search
// Real provider: Google Places API (New) Text Search.
// - Falls back to mock with isDemo:true ONLY when GOOGLE_PLACES_API_KEY is unset.
// - On Google API errors, returns a real error so the user can fix it.
// - In-memory cache (5 min) for instant repeat searches.

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

interface PlaceTextSearchResult {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    userRatingCount?: number;
    rating?: number;
    priceLevel?: string;
    businessStatus?: string;
  }>;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// --- tiny in-memory cache (per Worker instance) ---
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; result: LeadSearchResult }>();
function cacheKey(input: z.infer<typeof InputSchema>) {
  return `${input.niche.toLowerCase().trim()}|${input.city.toLowerCase().trim()}|${input.country.toLowerCase().trim()}|${input.limit ?? 12}`;
}

async function searchGooglePlaces(
  input: z.infer<typeof InputSchema>,
  apiKey: string,
): Promise<{ raws: RawLead[]; httpStatus: number }> {
  const limit = input.limit ?? 12;
  // Phrase the query so Google biases to the location and category.
  const textQuery = `top ${input.niche} in ${input.city}, ${input.country}`;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      // Field mask is required and controls cost. Keep it tight.
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.userRatingCount",
        "places.rating",
        "places.priceLevel",
        "places.businessStatus",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      pageSize: 20, // Places max per page; we'll trim client-side
      // Region biasing: ISO 3166-1 alpha-2 hint helps disambiguate.
      regionCode: regionCodeFor(input.country),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Google Places ${res.status}: ${text.slice(0, 300)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const data = (await res.json()) as PlaceTextSearchResult;
  const places = (data.places ?? []).filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY");

  const raws: RawLead[] = places.slice(0, limit).map((p) => ({
    business_name: p.displayName?.text ?? "Unknown business",
    niche: input.niche,
    city: input.city,
    country: input.country,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
    email: null, // Places API does not expose email
    website: p.websiteUri ?? null,
    instagram: null,
    facebook: null,
    reviews_estimate: p.userRatingCount ?? 0,
    website_quality_score: 0, // inferred by scoring layer
    source_id: p.id,
    source: "google_places",
  }));

  // Sort: most reviews first — proxy for "real, established business"
  raws.sort((a, b) => b.reviews_estimate - a.reviews_estimate);

  return { raws, httpStatus: res.status };
}

function regionCodeFor(country: string): string | undefined {
  const map: Record<string, string> = {
    Nigeria: "NG",
    Ghana: "GH",
    Kenya: "KE",
    "South Africa": "ZA",
    Egypt: "EG",
  };
  return map[country];
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

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        // No real provider configured → demo mode (intentional fallback).
        if (!apiKey) {
          const leads = enrichLeads(buildMockRawLeads(input));
          return jsonResponse({
            leads,
            source: "mock",
            isDemo: true,
            notice: "Demo data. Add GOOGLE_PLACES_API_KEY to pull real businesses.",
          } satisfies LeadSearchResult);
        }

        // Cache hit → instant.
        const key = cacheKey(input);
        const cached = cache.get(key);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
          return jsonResponse(cached.result);
        }

        try {
          const { raws } = await searchGooglePlaces(input, apiKey);
          const result: LeadSearchResult = {
            leads: enrichLeads(raws),
            source: "google_places",
            isDemo: false,
            notice: raws.length === 0
              ? "No results from Google Places for that niche + city."
              : undefined,
          };
          cache.set(key, { at: Date.now(), result });
          return jsonResponse(result);
        } catch (e) {
          const err = e as Error & { status?: number };
          console.error("[/api/leads/search] Google Places error:", err.message);
          // Return real error so user can fix the key/quota — DON'T silently mask.
          const status = err.status ?? 502;
          const userMessage =
            status === 403
              ? "Google rejected the API key. Check that the key is valid and that the Places API (New) is enabled for it."
              : status === 429
                ? "Google Places quota or rate limit reached. Try again in a minute."
                : "Couldn't reach Google Places. Check the server logs for details.";
          return jsonResponse({ error: userMessage }, status);
        }
      },
    },
  },
});
