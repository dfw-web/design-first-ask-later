// Public entry point for the lead-generation layer.
// Components import from here, never from a specific provider.

import { openStreetMapProvider } from "./providers/openstreetmap";
import { mockProvider } from "./providers/mock";
import type { LeadSearchInput, LeadSearchResult } from "./types";

export type { Lead, LeadSearchInput, LeadSearchResult, LeadSourceId, RawLead } from "./types";
export { enrichLead, enrichLeads } from "./scoring";

/**
 * Search leads via the server (which calls OpenStreetMap Nominatim).
 * Falls back to local mock only on hard network errors.
 */
export async function searchLeads(input: LeadSearchInput): Promise<LeadSearchResult> {
  try {
    return await openStreetMapProvider.search(input);
  } catch (e) {
    console.warn("[leads] network error, using local mock:", e);
    const fallback = await mockProvider.search(input);
    return {
      ...fallback,
      notice: "Network error — showing demo data instead.",
    };
  }
}

// --- Outreach helpers ---

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

// --- Email pitch ---

export function generateEmailPitch(niche: string, businessName: string): { subject: string; body: string } {
  const key = niche.trim().toLowerCase();
  const subjects: Record<string, string> = {
    dentist: `Helping ${businessName} get more patient bookings`,
    hotel: `More direct bookings for ${businessName} (skip OTA fees)`,
    restaurant: `Idea to double ${businessName}'s weekend bookings`,
    hospital: `Helping ${businessName} reach more patients online`,
    salon: `Filling ${businessName}'s appointment book with Instagram`,
    default: `Quick idea to bring ${businessName} more local clients`,
  };
  const subject = subjects[key] ?? subjects.default;
  const body = `Hi ${businessName} team,

I came across ${businessName} while researching ${niche || "businesses"} in your area, and I noticed a few quick wins that could bring you significantly more clients in the next 30 days.

I work with local businesses to:
 • Build a clean, high-converting website
 • Set up Google My Business + WhatsApp for instant inquiries
 • Run targeted Instagram & Google campaigns

Would you be open to a 10-minute call this week to see if it's a fit?

Best,
Nexloft Digital
nexloftdigital.com`;
  return { subject, body };
}

export function mailtoLink(email: string | null, subject: string, body: string): string {
  if (!email) return "#";
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
