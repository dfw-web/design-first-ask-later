// Pure helpers used by both the search route (server) and scoring (shared).
// Keep these dependency-free so they're safe in any runtime.

import type { LeadSourceId, RawLead } from "./types";

const COUNTRY_DIAL: Record<string, string> = {
  Nigeria: "234",
  Ghana: "233",
  Kenya: "254",
  "South Africa": "27",
  Egypt: "20",
  Uganda: "256",
  Tanzania: "255",
  Rwanda: "250",
  Ethiopia: "251",
  Morocco: "212",
  Senegal: "221",
};

/** Normalize a phone string to international E.164-ish digits (no +). Returns null if too short. */
export function normalizePhone(raw: string | null | undefined, country: string): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  // OSM often stores multiple numbers separated by ; or ,
  const first = trimmed.split(/[;,]/)[0].trim();
  let digits = first.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (digits.startsWith("+")) {
    const d = digits.slice(1);
    return d.length >= 8 && d.length <= 15 ? d : null;
  }
  // Local number — prepend country dial code, strip a leading 0.
  const dial = COUNTRY_DIAL[country];
  if (!dial) return digits.length >= 8 && digits.length <= 15 ? digits : null;
  const local = digits.replace(/^0+/, "");
  const combined = dial + local;
  return combined.length >= 8 && combined.length <= 15 ? combined : null;
}

/** Pretty-print a normalized phone with a leading + for display. */
export function formatPhone(digits: string | null): string | null {
  if (!digits) return null;
  return "+" + digits;
}

/** Make sure a website URL has a scheme and looks valid. */
export function cleanWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = String(raw).trim();
  if (!v) return null;
  v = v.split(/[\s;,]/)[0];
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    if (!u.hostname.includes(".")) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Normalize an Instagram value (handle, URL, or @handle) into a profile URL. */
export function cleanInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "").split("/")[0];
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
}

export function cleanFacebook(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://facebook.com/${v.replace(/^\/+/, "")}`;
}

export function cleanEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).split(/[;,]/)[0].trim();
  return /^[^ \s@]+@[^ \s@]+\.[^ \s@]+$/.test(v) ? v : null;
}

export function mapsSearchUrl(businessName: string, city: string): string {
  const q = encodeURIComponent(`${businessName} ${city}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function googleSearchUrl(businessName: string, city: string): string {
  const q = encodeURIComponent(`${businessName} ${city}`);
  return `https://www.google.com/search?q=${q}`;
}

export function instagramTagUrl(businessName: string): string {
  const tag = businessName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `https://www.instagram.com/explore/tags/${tag || "business"}`;
}

export function whatsappUrl(phoneDigits: string | null, message?: string): string | null {
  if (!phoneDigits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${phoneDigits}${text}`;
}

/** Stable signature for dedup: lowercase name + rounded coords (~110m). */
export function dedupKey(r: Pick<RawLead, "business_name" | "lat" | "lon" | "city">): string {
  const name = r.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (typeof r.lat === "number" && typeof r.lon === "number") {
    return `${name}|${r.lat.toFixed(3)}|${r.lon.toFixed(3)}`;
  }
  return `${name}|${r.city.toLowerCase()}`;
}

/** Count how many "completeness" fields a lead has — used to keep the richer copy on dedup. */
export function completenessScore(r: RawLead): number {
  let s = 0;
  if (r.phone) s += 3;
  if (r.website) s += 2;
  if (r.email) s += 2;
  if (r.instagram) s += 1;
  if (r.facebook) s += 1;
  if (r.address) s += 1;
  return s;
}

/** Merge duplicate raw leads, keeping the most complete fields. */
export function mergeRawLeads(leads: RawLead[]): RawLead[] {
  const map = new Map<string, RawLead>();
  for (const lead of leads) {
    const key = dedupKey(lead);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, lead);
      continue;
    }
    map.set(key, {
      ...prev,
      phone: prev.phone ?? lead.phone,
      email: prev.email ?? lead.email,
      website: prev.website ?? lead.website,
      instagram: prev.instagram ?? lead.instagram,
      facebook: prev.facebook ?? lead.facebook,
      address: prev.address ?? lead.address,
      location_type: prev.location_type ?? lead.location_type,
      reviews_estimate: Math.max(prev.reviews_estimate, lead.reviews_estimate),
      lat: prev.lat ?? lead.lat,
      lon: prev.lon ?? lead.lon,
      // Keep more reliable source if conflict (openstreetmap > mock).
      source:
        prev.source === "openstreetmap" || lead.source === "openstreetmap"
          ? ("openstreetmap" as LeadSourceId)
          : prev.source,
    });
  }
  return Array.from(map.values());
}

/** Quality filter: must have at least phone OR website OR (we always have maps_url). */
export function hasMinContact(r: RawLead): boolean {
  return !!(r.phone || r.website);
}
