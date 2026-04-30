// Anonymous "Save to CRM" — stores leads in localStorage when the user is
// signed out, then syncs them to Supabase on sign-in.

import type { Lead } from "./types";
import { supabase } from "@/integrations/supabase/client";

const KEY = "nexloft.savedLeads.v1";

interface StoredLead {
  savedAt: string;
  lead: Lead;
}

export function loadLocalLeads(): StoredLead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredLead[];
  } catch {
    return [];
  }
}

export function saveLocalLead(lead: Lead): void {
  if (typeof window === "undefined") return;
  const all = loadLocalLeads();
  const sig = lead.source_id ?? `${lead.business_name}|${lead.city}`;
  const exists = all.some(
    (s) => (s.lead.source_id ?? `${s.lead.business_name}|${s.lead.city}`) === sig,
  );
  if (exists) return;
  all.unshift({ savedAt: new Date().toISOString(), lead });
  window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
}

export function clearLocalLeads(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Push any locally-stored leads to the user's account, then clear local. */
export async function syncLocalLeadsToAccount(userId: string): Promise<number> {
  const all = loadLocalLeads();
  if (!all.length) return 0;
  const rows = all.map(({ lead }) => ({
    user_id: userId,
    business_name: lead.business_name,
    niche: lead.niche,
    city: lead.city,
    country: lead.country,
    phone: lead.phone,
    email: lead.email,
    website: lead.website,
    instagram: lead.instagram,
    facebook: lead.facebook,
    lead_score: lead.lead_score,
    website_quality_score: lead.website_quality_score,
    reviews_estimate: lead.reviews_estimate,
    whatsapp_score: lead.whatsapp_score,
    whatsapp_label: lead.whatsapp_label,
    number_validity: lead.number_validity,
    recommended_service: lead.recommended_service,
  }));
  const { error } = await supabase.from("saved_leads").insert(rows);
  if (error) {
    console.warn("[leads/sync] failed:", error.message);
    return 0;
  }
  clearLocalLeads();
  return rows.length;
}
