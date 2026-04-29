import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Trash2, MessageCircle, ExternalLink } from "lucide-react";
import { whatsappLink, generatePitch } from "@/lib/leadGenerator";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/leads")({
  component: SavedLeadsPage,
});

type SavedLead = {
  id: string;
  business_name: string;
  niche: string;
  city: string;
  country: string;
  phone: string | null;
  website: string | null;
  lead_score: number;
  whatsapp_score: number;
  whatsapp_label: string | null;
  recommended_service: string | null;
  status: string;
  deal_value: number;
};

const STATUSES = ["New", "Contacted", "Follow-up", "Won", "Lost"];

function SavedLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("saved_leads")
        .select("id, business_name, niche, city, country, phone, website, lead_score, whatsapp_score, whatsapp_label, recommended_service, status, deal_value")
        .order("created_at", { ascending: false });
      if (error) toast.error("Could not load leads");
      setLeads((data ?? []) as SavedLead[]);
      setLoading(false);
    })();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    setLeads((cur) => cur.map((l) => l.id === id ? { ...l, status } : l));
    const { error } = await supabase.from("saved_leads").update({ status }).eq("id", id);
    if (error) toast.error("Could not update");
  };

  const remove = async (id: string) => {
    setLeads((cur) => cur.filter((l) => l.id !== id));
    const { error } = await supabase.from("saved_leads").delete().eq("id", id);
    if (error) toast.error("Could not delete");
    else toast.success("Lead removed");
  };

  const exportCsv = () => {
    if (leads.length === 0) return;
    const header = ["business_name", "niche", "city", "country", "phone", "website", "lead_score", "whatsapp_score", "status"];
    const rows = leads.map((l) => header.map((k) => JSON.stringify((l as any)[k] ?? "")).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "naijaclientr-leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Saved leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your CRM — track outreach and close deals.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={leads.length === 0}>Export CSV</Button>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No saved leads yet. Run a search to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">WA</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.business_name}</div>
                    <div className="text-xs text-muted-foreground">{l.niche} · {l.city}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{l.lead_score}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.whatsapp_label}</td>
                  <td className="px-4 py-3 text-xs">{l.recommended_service}</td>
                  <td className="px-4 py-3">
                    <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {l.phone && (
                        <a
                          href={whatsappLink(l.phone, generatePitch(l.niche, l.business_name))}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-whatsapp text-whatsapp-foreground hover:opacity-90"
                          title="Open WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {l.website && (
                        <a href={l.website} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary" title="Visit website">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => remove(l.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
