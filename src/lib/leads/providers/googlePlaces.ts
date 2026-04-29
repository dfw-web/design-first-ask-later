// Google Places provider (client-side wrapper).
// Calls our own server route /api/leads/search, which holds the GOOGLE_PLACES_API_KEY
// and talks to Google. The key is never shipped to the browser.

import type { LeadProvider, LeadSearchResult } from "../types";

export const googlePlacesProvider: LeadProvider = {
  id: "google_places",
  // Whether the provider is "available" is decided server-side (checks env).
  // From the client we always allow the attempt; the server returns isDemo=true
  // with a notice if the key is missing, and we transparently fall back.
  isAvailable: () => true,
  async search(input) {
    const res = await fetch("/api/leads/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      throw new Error(`Lead search failed (${res.status})`);
    }
    const data = (await res.json()) as LeadSearchResult;
    return data;
  },
};
