// Public entry point for the lead-generation layer.
// Components import from here, never from a specific provider.

import { googlePlacesProvider } from "./providers/googlePlaces";
import { mockProvider } from "./providers/mock";
import type { Lead, LeadSearchInput, LeadSearchResult } from "./types";

export type { Lead, LeadSearchInput, LeadSearchResult, LeadSourceId, RawLead } from "./types";
export { enrichLead, enrichLeads } from "./scoring";

/**
 * Search leads. Always tries the real (Google Places) provider first by hitting
 * our server route — the server decides whether a real key is configured and,
 * if not, transparently returns demo data with `isDemo: true`. If the network
 * call itself fails, we fall back to the local mock so the UI never breaks.
 */
export async function searchLeads(input: LeadSearchInput): Promise<LeadSearchResult> {
  try {
    return await googlePlacesProvider.search(input);
  } catch (e) {
    console.warn("[leads] real provider failed, falling back to mock:", e);
    const fallback = await mockProvider.search(input);
    return {
      ...fallback,
      notice: "Couldn't reach the live data provider — showing demo data instead.",
    };
  }
}

// --- Outreach helpers (kept here so they live with the leads domain) ---

export function whatsappLink(phone: string | null, message?: string) {
  if (!phone) return "#";
  const digits = phone.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function generatePitch(niche: string, businessName: string) {
  const templates: Record<string, string> = {
    dentist: `Hi! I came across ${businessName} and noticed your online presence could attract more patients. I help local dental clinics get fully booked through Google and Instagram. Open to a quick chat this week?`,
    hotel: `Hello ${businessName} team — I help boutique hotels in your area get more direct bookings (skipping OTA fees). Would you be open to a 10-minute call to see if it'd work for you?`,
    restaurant: `Hi! Big fan of ${businessName}. I help restaurants double their weekend bookings with simple Instagram and Google updates. Want me to send a 2-minute audit?`,
    default: `Hi! I came across ${businessName} and saw a few opportunities to bring you more local clients. I help businesses like yours grow through digital. Open to a quick chat?`,
  };
  return templates[niche.trim().toLowerCase()] ?? templates.default;
}
