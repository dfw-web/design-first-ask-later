// CSV export for leads — covers every field listed in the brief.

import type { Lead } from "./types";

const HEADERS = [
  "Business Name",
  "Category",
  "City",
  "Country",
  "Phone",
  "Email",
  "Website",
  "WhatsApp Link",
  "Google Maps Link",
  "Instagram",
  "Facebook",
  "Lead Score",
  "Quality",
  "Opportunity",
  "Recommended Service",
  "Source",
  "Found At",
];

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function leadsToCsv(leads: Lead[]): string {
  const rows: string[] = [HEADERS.join(",")];
  for (const l of leads) {
    rows.push(
      [
        l.business_name,
        l.location_type ?? l.niche,
        l.city,
        l.country,
        l.phone,
        l.email,
        l.website,
        l.whatsapp_url,
        l.maps_url,
        l.instagram,
        l.facebook,
        l.lead_score,
        l.quality_label,
        l.opportunity_reason,
        l.recommended_service,
        l.source,
        l.found_at,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return rows.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
