// Shared types for the lead-generation layer.
// All providers (mock, Google Places, Yelp, etc.) return data shaped like `Lead`.

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
}

/** Fully enriched lead returned to the UI. */
export interface Lead extends RawLead {
  lead_score: number;
  website_quality_score: number;
  whatsapp_score: number;
  whatsapp_label: WhatsAppLabel;
  number_validity: NumberValidity;
  recommended_service: string;
}

export interface LeadSearchInput {
  niche: string;
  city: string;
  country: string;
  limit?: number;
}

export type LeadSourceId = "mock" | "google_places";

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
