// Server route: POST /api/leads/search
// Uses Google Places API (New) when GOOGLE_PLACES_API_KEY is set.
// Falls back to mock data with isDemo:true when no key is configured.

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
    userRatingCount?: number;
    rating?: number;
  }>;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function searchGooglePlaces(
  input: z.infer<typeof InputSchema>,
  apiKey: string,
): Promise<RawLead[]> {
  const query = `${input.niche} in ${input.city}, ${input.country}`;
  const limit = input.limit ?? 12;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      // Field mask is required by Places API (New). Keep it minimal to control cost.
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.userRatingCount,places.rating",
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: Math.min(limit, 20),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as PlaceTextSearchResult;
  const places = data.places ?? [];

  return places.slice(0, limit).map((p): RawLead => ({
    business_name: p.displayName?.text ?? "Unknown business",
    niche: input.niche,
    city: input.city,
    country: input.country,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
    email: null, // Google Places doesn't expose email
    website: p.websiteUri ?? null,
    instagram: null, // socials require a separate enrichment step (future)
    facebook: null,
    reviews_estimate: p.userRatingCount ?? 0,
    // We don't crawl the site here — leave 0 so scoring infers a default.
    website_quality_score: 0,
    source_id: p.id,
    source: "google_places",
  }));
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
          return jsonResponse({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }
        const input = parsed.data;

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        // No real provider configured → demo mode.
        if (!apiKey) {
          const leads = enrichLeads(buildMockRawLeads(input));
          const result: LeadSearchResult = {
            leads,
            source: "mock",
            isDemo: true,
            notice: "Demo data. Add a GOOGLE_PLACES_API_KEY secret to pull real businesses.",
          };
          return jsonResponse(result);
        }

        try {
          const raws = await searchGooglePlaces(input, apiKey);
          if (raws.length === 0) {
            return jsonResponse({
              leads: [],
              source: "google_places",
              isDemo: false,
              notice: "No results from Google Places for that niche + city.",
            } satisfies LeadSearchResult);
          }
          const result: LeadSearchResult = {
            leads: enrichLeads(raws),
            source: "google_places",
            isDemo: false,
          };
          return jsonResponse(result);
        } catch (e) {
          console.error("[/api/leads/search] Google Places error:", e);
          // Soft fallback so the UI keeps working.
          const leads = enrichLeads(buildMockRawLeads(input));
          const result: LeadSearchResult = {
            leads,
            source: "mock",
            isDemo: true,
            notice: "Live provider error — showing demo data. Check the server logs.",
          };
          return jsonResponse(result);
        }
      },
    },
  },
});
