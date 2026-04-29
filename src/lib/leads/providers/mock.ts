// Mock provider — produces realistic-looking sample leads with no external
// dependencies. Always available; used as the demo fallback.

import type { LeadProvider, LeadSearchInput, LeadSearchResult, RawLead } from "../types";
import { enrichLeads } from "../scoring";

const BUSINESS_PREFIXES = [
  "Royal", "Bright", "Premium", "Golden", "Elite", "Crown", "Pearl", "Sunrise", "Heritage", "Olive",
];

const BUSINESS_SUFFIXES: Record<string, string[]> = {
  dentist: ["Dental Clinic", "Smiles Dentistry", "Family Dental", "Dental Care", "Orthodontics"],
  hotel: ["Hotel & Suites", "Hotel", "Lodge", "Resort", "Boutique Hotel"],
  restaurant: ["Restaurant", "Kitchen", "Bistro", "Eatery", "Grill"],
  hospital: ["Hospital", "Medical Center", "Clinic", "Health Centre"],
  salon: ["Salon & Spa", "Beauty Lounge", "Hair Studio", "Salon"],
  lawyer: ["Chambers", "Legal Partners", "& Associates", "Law Firm"],
  church: ["Assembly", "Ministries", "Chapel", "Tabernacle"],
  school: ["Academy", "International School", "College"],
  boutique: ["Boutique", "Fashion House", "Couture", "Apparel"],
  default: ["Co.", "Group", "Limited", "Services", "Hub"],
};

const COUNTRY_CODES: Record<string, string> = {
  Nigeria: "+234",
  Ghana: "+233",
  Kenya: "+254",
  "South Africa": "+27",
  Egypt: "+20",
};

const NIGERIAN_PREFIXES = ["803", "806", "810", "813", "814", "816", "817", "818", "703", "706", "905", "907", "915"];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function rand(seed: number, max: number) {
  const x = Math.sin(seed * 9999.13) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

export function buildMockRawLeads(input: LeadSearchInput): RawLead[] {
  const niche = input.niche.trim();
  const city = (input.city.trim() || "Lagos").split(" ")[0];
  const country = input.country;
  const count = input.limit ?? 12;
  const nicheKey = niche.toLowerCase();
  const suffixes = BUSINESS_SUFFIXES[nicheKey] ?? BUSINESS_SUFFIXES.default;
  const code = COUNTRY_CODES[country] ?? "+234";

  return Array.from({ length: count }).map((_, i): RawLead => {
    const seed = i + niche.length + city.length + 7;
    const business_name = `${pick(BUSINESS_PREFIXES, seed)} ${city} ${pick(suffixes, seed + 1)}`;
    const hasPhone = rand(seed, 10) > 1;
    const hasWebsite = rand(seed + 1, 10) > 4;
    const hasEmail = rand(seed + 2, 10) > 3;
    const hasInsta = rand(seed + 3, 10) > 5;
    const hasFb = rand(seed + 4, 10) > 4;

    const phone = hasPhone
      ? `${code} ${pick(NIGERIAN_PREFIXES, seed + 6)} ${String(rand(seed + 7, 900) + 100)} ${String(rand(seed + 8, 9000) + 1000)}`
      : null;
    const slug = business_name.toLowerCase().replace(/[^a-z0-9]+/g, "");

    return {
      business_name,
      niche,
      city,
      country,
      phone,
      email: hasEmail ? `info@${slug.slice(0, 14)}.com` : null,
      website: hasWebsite ? `https://${slug.slice(0, 18)}.com` : null,
      instagram: hasInsta ? `https://instagram.com/${slug.slice(0, 16)}` : null,
      facebook: hasFb ? `https://facebook.com/${slug.slice(0, 16)}` : null,
      reviews_estimate: rand(seed + 11, 250),
      website_quality_score: hasWebsite ? 30 + rand(seed + 10, 60) : 0,
      source_id: `mock_${slug}_${i}`,
      source: "mock",
    };
  });
}

export const mockProvider: LeadProvider = {
  id: "mock",
  isAvailable: () => true,
  async search(input) {
    const leads = enrichLeads(buildMockRawLeads(input));
    const result: LeadSearchResult = {
      leads,
      source: "mock",
      isDemo: true,
      notice: "Demo data — connect a real provider (Google Places) to pull live businesses.",
    };
    return result;
  },
};
