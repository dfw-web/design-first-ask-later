// Google Places provider (client-side wrapper).
// Calls our own server route /api/leads/search, which holds the
// GOOGLE_PLACES_API_KEY and talks to Google. The key is never shipped to the
// browser — see Network tab: only requests to /api/leads/search are made.

import type { LeadProvider, LeadSearchResult } from "../types";

export const googlePlacesProvider: LeadProvider = {
  id: "google_places",
  isAvailable: () => true, // server decides real-vs-demo
  async search(input) {
    const res = await fetch("/api/leads/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      let message = `Lead search failed (${res.status})`;
      try {
        const data = (await res.json()) as { error?: string };
        if (data?.error) message = data.error;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(message);
    }
    return (await res.json()) as LeadSearchResult;
  },
};
