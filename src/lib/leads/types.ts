// Shared types for the lead-generation layer.
// All providers (mock, OpenStreetMap, etc.) return data shaped like `Lead`.

export type WhatsAppLabel =
  | "Highly Likely on WhatsApp"
  | "Likely on WhatsApp"
  | "Unknown"
  | "Low Confidence";

export type NumberValidity =
  | "Valid Number"
  | "Suspicious Format"
  | "Incomplete Number"
  | "Invalid Number";

export type LeadQualityLabel = "Hot Lead" | "Medium Opportunity" | "Low Priority";

/** Raw lead before enrichment — what a provider produces from its source. */
export interface RawLead {
  business_name: string;
  niche: string;
  city: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  reviews_estimate: number;
  /** 0-100 estimate of website quality. 0 if no website. Providers may leave 0 — scoring will infer. */
  website_quality_score?: number;
  /** Provider-specific external id (e.g. Google place_id). Useful for dedup. */
  source_id?: string;
  /** Which provider returned this row. */
  source: LeadSourceId;
  /** Optional address string from provider. */
  address?: string | null;
  /** Optional location type/category from provider. */
  location_type?: string | null;
  /** Latitude for dedup / mapping. */
  lat?: number | null;
  /** Longitude for dedup / mapping. */
  lon?: number | null;
}

/** Fully enriched lead returned to the UI. */
export interface Lead extends RawLead {
  lead_score: number;
  website_quality_score: number;
  whatsapp_score: number;
  whatsapp_label: WhatsAppLabel;
  number_validity: NumberValidity;
  recommended_service: string;
  /** Hot/Medium/Low bucket from lead_score. */
  quality_label: LeadQualityLabel;
  /** One-line "why this lead is good". */
  opportunity_reason: string;
  /** Pre-built Google Maps search link. */
  maps_url: string;
  /** Pre-built WhatsApp link if phone present. */
  whatsapp_url: string | null;
  /** Pre-built quick-discovery links for "Find More Info". */
  find_more: {
    google: string;
    maps: string;
    instagram: string;
  };
  /** ISO date when this lead was first found. */
  found_at: string;
}

export interface LeadSearchInput {
  niche: string;
  city: string;
  country: string;
  limit?: number;
}

export type LeadSourceId = "mock" | "openstreetmap";

export interface LeadSearchResult {
  leads: Lead[];
  source: LeadSourceId;
  /** True if results are demo/sample data, not from a real directory. */
  isDemo: boolean;
  /** Human-readable note (e.g. why we fell back to demo). */
  notice?: string;
}

export interface LeadProvider {
  id: LeadSourceId;
  /** True if the provider has the credentials/config it needs to run. */
  isAvailable(): boolean;
  search(input: LeadSearchInput): Promise<LeadSearchResult>;
}
