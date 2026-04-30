// Provider-agnostic enrichment: takes a RawLead and computes scores, labels,
// and a recommended service. Keep all scoring logic here so every provider
// (mock, OpenStreetMap, etc.) produces consistent output for the UI.

import type {
  Lead,
  LeadQualityLabel,
  NumberValidity,
  RawLead,
  WhatsAppLabel,
} from "./types";
import {
  cleanEmail,
  cleanFacebook,
  cleanInstagram,
  cleanWebsite,
  formatPhone,
  googleSearchUrl,
  instagramTagUrl,
  mapsSearchUrl,
  normalizePhone,
  whatsappUrl,
} from "./normalize";

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

const NICHE_BOOST: Record<string, number> = {
  hospital: 25,
  clinic: 25,
  dentist: 20,
  dental: 20,
  hotel: 20,
  lodge: 20,
  resort: 20,
  salon: 15,
  spa: 15,
  school: 15,
  academy: 15,
  pharmacy: 15,
};

/** Quick heuristic for phone validity given an international-ish format. */
export function classifyPhone(phone: string | null): NumberValidity {
  if (!phone) return "Invalid Number";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return "Incomplete Number";
  if (digits.length > 15) return "Suspicious Format";
  if (digits.length < 10) return "Suspicious Format";
  return "Valid Number";
}

function whatsappLabelFor(score: number): WhatsAppLabel {
  if (score >= 80) return "Highly Likely on WhatsApp";
  if (score >= 55) return "Likely on WhatsApp";
  if (score >= 30) return "Unknown";
  return "Low Confidence";
}

function qualityLabelFor(score: number): LeadQualityLabel {
  if (score >= 70) return "Hot Lead";
  if (score >= 40) return "Medium Opportunity";
  return "Low Priority";
}

function recommendedService(raw: RawLead, websiteQuality: number): string {
  if (!raw.website) return "Website + Google My Business";
  if (websiteQuality < 50) return "Website redesign";
  if (!raw.instagram && !raw.facebook) return "Social media setup";
  if (raw.reviews_estimate < 20) return "Reviews + Local SEO";
  const seed = (raw.source_id ?? raw.business_name).length;
  return SERVICES[seed % SERVICES.length];
}

function opportunityReasonFor(raw: RawLead, score: number): string {
  if (!raw.website && !raw.instagram && !raw.facebook)
    return "No website or social presence — wide-open opportunity";
  if (!raw.website) return "Has socials but no website — easy upsell";
  if (!raw.instagram && !raw.facebook) return "Has site but no social presence";
  if (raw.reviews_estimate > 0 && raw.reviews_estimate < 20)
    return "Low review count — needs reputation help";
  if (score >= 70) return "Strong fit — multiple gaps to fix";
  return "Solid contact info — worth reaching out";
}

function nicheBoost(niche: string): number {
  const key = niche.toLowerCase();
  for (const [k, v] of Object.entries(NICHE_BOOST)) {
    if (key.includes(k)) return v;
  }
  return 0;
}

export function enrichLead(raw: RawLead): Lead {
  // 1. Clean inputs (idempotent — providers may have done this already).
  const phoneDigits = normalizePhone(raw.phone, raw.country);
  const phoneDisplay = formatPhone(phoneDigits);
  const website = cleanWebsite(raw.website);
  const email = cleanEmail(raw.email);
  const instagram = cleanInstagram(raw.instagram);
  const facebook = cleanFacebook(raw.facebook);

  const number_validity = classifyPhone(phoneDisplay);

  const website_quality_score = website
    ? raw.website_quality_score && raw.website_quality_score > 0
      ? Math.min(100, Math.round(raw.website_quality_score))
      : 55
    : 0;

  const hasSocial = !!(instagram || facebook);

  // WhatsApp likelihood (kept as secondary signal).
  const whatsapp_score = Math.max(
    0,
    Math.min(
      100,
      (number_validity === "Valid Number" ? 55 : 10) +
        (website ? 15 : 0) +
        (hasSocial ? 15 : 0) +
        (raw.reviews_estimate > 0 ? 10 : 0),
    ),
  );

  // Lead score: NEW base rules + niche boost + secondary signals.
  let score = 0;
  if (!website) score += 30;
  if (phoneDisplay && !website) score += 20;
  if (!email) score += 15;
  if (!hasSocial) score += 10;
  if (raw.reviews_estimate > 0 && raw.reviews_estimate < 20) score += 10;
  score += nicheBoost(raw.niche);
  // Secondary: penalize very low website quality (kept as merge with old model).
  if (website && website_quality_score < 50) score += 10;
  // Secondary: strong WhatsApp signal slightly bumps because outreach is easier.
  if (whatsapp_score >= 70) score += 5;

  const lead_score = Math.min(100, score);

  return {
    ...raw,
    phone: phoneDisplay,
    website,
    email,
    instagram,
    facebook,
    website_quality_score,
    number_validity,
    whatsapp_score,
    whatsapp_label: whatsappLabelFor(whatsapp_score),
    lead_score,
    recommended_service: recommendedService(
      { ...raw, phone: phoneDisplay, website, email, instagram, facebook },
      website_quality_score,
    ),
    quality_label: qualityLabelFor(lead_score),
    opportunity_reason: opportunityReasonFor(
      { ...raw, phone: phoneDisplay, website, email, instagram, facebook },
      lead_score,
    ),
    maps_url: mapsSearchUrl(raw.business_name, raw.city),
    whatsapp_url: whatsappUrl(phoneDigits),
    find_more: {
      google: googleSearchUrl(raw.business_name, raw.city),
      maps: mapsSearchUrl(raw.business_name, raw.city),
      instagram: instagramTagUrl(raw.business_name),
    },
    found_at: new Date().toISOString(),
  };
}

export function enrichLeads(raws: RawLead[]): Lead[] {
  return raws.map(enrichLead);
}
