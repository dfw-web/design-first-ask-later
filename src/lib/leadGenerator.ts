// Mock lead generator — produces realistic-looking sample leads for a niche + city.
// Will later be swapped for real data sources.

export type GeneratedLead = {
  business_name: string;
  niche: string;
  city: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  lead_score: number;
  website_quality_score: number;
  reviews_estimate: number;
  whatsapp_score: number;
  whatsapp_label: "Highly Likely on WhatsApp" | "Likely on WhatsApp" | "Unknown" | "Low Confidence";
  number_validity: "Valid Number" | "Suspicious Format" | "Incomplete Number" | "Invalid Number";
  recommended_service: string;
};

const BUSINESS_PREFIXES: Record<string, string[]> = {
  default: ["Royal", "Bright", "Premium", "Golden", "Elite", "Crown", "Pearl", "Sunrise", "Heritage", "Olive"],
};

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

const NIGERIAN_PREFIXES = ["803", "806", "810", "813", "814", "816", "817", "818", "703", "706", "813", "905", "907", "915"];

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

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function rand(seed: number, max: number) {
  // Deterministic-ish pseudo random
  const x = Math.sin(seed * 9999.13) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

export function generateMockLeads(niche: string, city: string, country: string, count = 12): GeneratedLead[] {
  const nicheKey = niche.trim().toLowerCase();
  const suffixes = BUSINESS_SUFFIXES[nicheKey] ?? BUSINESS_SUFFIXES.default;
  const prefixes = BUSINESS_PREFIXES.default;
  const code = COUNTRY_CODES[country] ?? "+234";
  const cityClean = city.trim() || "Lagos";

  return Array.from({ length: count }).map((_, i) => {
    const seed = i + niche.length + city.length + 7;
    const name = `${pick(prefixes, seed)} ${cityClean.split(" ")[0]} ${pick(suffixes, seed + 1)}`;
    const hasPhone = rand(seed, 10) > 1;
    const hasWebsite = rand(seed + 1, 10) > 4;
    const hasEmail = rand(seed + 2, 10) > 3;
    const hasInsta = rand(seed + 3, 10) > 5;
    const hasFb = rand(seed + 4, 10) > 4;

    const validityRoll = rand(seed + 5, 10);
    const number_validity: GeneratedLead["number_validity"] =
      !hasPhone ? "Invalid Number" :
      validityRoll > 8 ? "Suspicious Format" :
      validityRoll > 9 ? "Incomplete Number" : "Valid Number";

    const phoneNumber = hasPhone
      ? `${code} ${pick(NIGERIAN_PREFIXES, seed + 6)} ${String(rand(seed + 7, 900) + 100)} ${String(rand(seed + 8, 9000) + 1000)}`
      : null;

    const wa_base = (number_validity === "Valid Number" ? 50 : 10)
      + (hasWebsite ? 15 : 0)
      + (hasInsta || hasFb ? 15 : 0)
      + rand(seed + 9, 20);
    const whatsapp_score = Math.min(100, wa_base);
    const whatsapp_label: GeneratedLead["whatsapp_label"] =
      whatsapp_score >= 80 ? "Highly Likely on WhatsApp" :
      whatsapp_score >= 55 ? "Likely on WhatsApp" :
      whatsapp_score >= 30 ? "Unknown" : "Low Confidence";

    const website_quality_score = hasWebsite ? 30 + rand(seed + 10, 60) : 0;
    const reviews_estimate = rand(seed + 11, 250);

    // Lead score: lower website quality + missing presence = higher need
    const lead_score = Math.min(100,
      (hasWebsite ? Math.max(0, 100 - website_quality_score) / 2 : 70)
      + (hasInsta || hasFb ? 0 : 15)
      + (reviews_estimate < 20 ? 15 : 0)
      + rand(seed + 12, 15)
    );

    const recommended_service =
      !hasWebsite ? "Website + Google My Business" :
      website_quality_score < 50 ? "Website redesign" :
      !hasInsta && !hasFb ? "Social media setup" :
      reviews_estimate < 20 ? "Reviews + Local SEO" :
      pick(SERVICES, seed + 13);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return {
      business_name: name,
      niche,
      city: cityClean,
      country,
      phone: phoneNumber,
      email: hasEmail ? `info@${slug.slice(0, 14)}.com` : null,
      website: hasWebsite ? `https://${slug.slice(0, 18)}.com` : null,
      instagram: hasInsta ? `https://instagram.com/${slug.slice(0, 16)}` : null,
      facebook: hasFb ? `https://facebook.com/${slug.slice(0, 16)}` : null,
      lead_score: Math.round(lead_score),
      website_quality_score: Math.round(website_quality_score),
      reviews_estimate,
      whatsapp_score,
      whatsapp_label,
      number_validity,
      recommended_service,
    };
  });
}

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
  const key = niche.trim().toLowerCase();
  return templates[key] ?? templates.default;
}
