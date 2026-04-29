// Backwards-compat shim. The real lead-generation layer lives in `@/lib/leads`.
// Existing imports (`@/lib/leadGenerator`) keep working through these re-exports.

export type { Lead as GeneratedLead, LeadSearchInput, LeadSearchResult } from "./leads";
export { searchLeads, whatsappLink, generatePitch } from "./leads";

import { buildMockRawLeads } from "./leads/providers/mock";
import { enrichLeads } from "./leads/scoring";
import type { Lead } from "./leads";

/** @deprecated Use `searchLeads({ niche, city, country, limit })` from `@/lib/leads`. */
export function generateMockLeads(niche: string, city: string, country: string, count = 12): Lead[] {
  return enrichLeads(buildMockRawLeads({ niche, city, country, limit: count }));
}
