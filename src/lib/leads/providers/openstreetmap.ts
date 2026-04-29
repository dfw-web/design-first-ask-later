// OpenStreetMap (Nominatim) provider — client-side wrapper.
// Talks to our own /api/leads/search route which proxies Nominatim
// (so we can attach the required User-Agent header server-side).

import type { LeadProvider, LeadSearchResult } from "../types";

export const openStreetMapProvider: LeadProvider = {
  id: "openstreetmap",
  isAvailable: () => true,
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
        // ignore
      }
      throw new Error(message);
    }
    return (await res.json()) as LeadSearchResult;
  },
};
