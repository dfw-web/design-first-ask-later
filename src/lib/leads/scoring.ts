// Provider-agnostic enrichment: takes a RawLead and computes scores, labels,
// and a recommended service. Keep all scoring logic here so every provider
// (mock, Google Places, etc.) produces consistent output for the UI.

import type { Lead, NumberValidity, RawLead, WhatsAppLabel } from "./types";

const SERVICES = [
  "Website redesign",
  "Google My Business setup",
  "Instagram growth",
  "Local SEO",
  "Google Ads",
  "Branding refresh",
  "Booking funnel",
  "WhatsApp automation",
];

/** Quick heuristic for phone validity given an international-ish format. */
export function classifyPhone(phone: string | null): NumberValidity {
  if (!phone) return "Invalid Number";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return "Incomplete Number";
  if (digits.length > 15) return "Suspicious Format";
  // Most valid international mobile numbers fall in 10-14 digits.
  if (digits.length < 10) return "Suspicious Format";
  return "Valid Number";
}

function whatsappLabelFor(score: number): WhatsAppLabel {
  if (score >= 80) return "Highly Likely on WhatsApp";
  if (score >= 55) return "Likely on WhatsApp";
  if (score >= 30) return "Unknown";
  return "Low Confidence";
}

function recommendedService(raw: RawLead, websiteQuality: number): string {
  if (!raw.website) return "Website + Google My Business";
  if (websiteQuality < 50) return "Website redesign";
  if (!raw.instagram && !raw.facebook) return "Social media setup";
  if (raw.reviews_estimate < 20) return "Reviews + Local SEO";
  // Stable pick from the catalog so the same lead doesn't flip every render.
  const seed = (raw.source_id ?? raw.business_name).length;
  return SERVICES[seed % SERVICES.length];
}

export function enrichLead(raw: RawLead): Lead {
  const number_validity = classifyPhone(raw.phone);

  // Website quality: trust provider value if given, otherwise infer.
  const website_quality_score = raw.website
    ? raw.website_quality_score && raw.website_quality_score > 0
      ? Math.min(100, Math.round(raw.website_quality_score))
      : 55 // unknown but present
    : 0;

  const hasSocial = !!(raw.instagram || raw.facebook);

  // WhatsApp likelihood: valid number + presence signals.
  const whatsapp_score = Math.max(
    0,
    Math.min(
      100,
      (number_validity === "Valid Number" ? 55 : 10) +
        (raw.website ? 15 : 0) +
        (hasSocial ? 15 : 0) +
        (raw.reviews_estimate > 0 ? 10 : 0),
    ),
  );

  // Lead score: HIGHER means they need our services more.
  const lead_score = Math.min(
    100,
    Math.round(
      (raw.website ? Math.max(0, 100 - website_quality_score) / 2 : 70) +
        (hasSocial ? 0 : 15) +
        (raw.reviews_estimate < 20 ? 15 : 0) +
        (number_validity === "Valid Number" ? 0 : 5),
    ),
  );

  return {
    ...raw,
    website_quality_score,
    number_validity,
    whatsapp_score,
    whatsapp_label: whatsappLabelFor(whatsapp_score),
    lead_score,
    recommended_service: recommendedService(raw, website_quality_score),
  };
}

export function enrichLeads(raws: RawLead[]): Lead[] {
  return raws.map(enrichLead);
}
