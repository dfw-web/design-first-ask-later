import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Globe, Phone, Instagram, Facebook, MessageCircle, Sparkles, Bookmark, Copy } from "lucide-react";
import { generateMockLeads, whatsappLink, generatePitch, type GeneratedLead } from "@/lib/leadGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { PitchGenerator } from "@/components/PitchGenerator";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const NICHES = ["dentist", "hotel", "restaurant", "salon", "lawyer", "church", "school", "boutique", "hospital"];
const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "Egypt"];

type Filter = "all" | "no-website" | "has-phone" | "high-score" | "low-reviews" | "no-social" | "wa-ready";

function DashboardPage() {
  const [niche, setNiche] = useState("dentist");
  const [city, setCity] = useState("Lagos");
  const [country, setCountry] = useState("Nigeria");
  const [results, setResults] = useState<GeneratedLead[]>([]);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !city.trim()) return;
    setResults(generateMockLeads(niche, city, country, 12));
    setSearched(true);
    setFilter("all");
  };

  const filtered = useMemo(() => {
    return results.filter((l) => {
      switch (filter) {
        case "no-website": return !l.website;
        case "has-phone": return !!l.phone;
        case "high-score": return l.lead_score >= 75;
        case "low-reviews": return l.reviews_estimate < 25;
        case "no-social": return !l.instagram && !l.facebook;
        case "wa-ready": return l.whatsapp_score >= 70;
        default: return true;
      }
    });
  }, [results, filter]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Find leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search a niche and city — get leads that need your services.</p>
      </header>

      <form onSubmit={handleSearch} className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="niche">Niche</Label>
            <Input id="niche" list="niches" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="dentist, hotel…" />
            <datalist id="niches">
              {NICHES.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos, Abuja…" />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>
        </div>
      </form>

      {searched && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{filtered.length} leads found</h2>
              <p className="text-sm text-muted-foreground">{niche} · {city}, {country}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ["all", "All"],
                ["wa-ready", "WhatsApp Ready"],
                ["no-website", "No website"],
                ["has-phone", "Has phone"],
                ["high-score", "High score"],
                ["low-reviews", "Low reviews"],
                ["no-social", "No social"],
              ] as [Filter, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                    (filter === k
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filtered.map((lead) => (
              <LeadCard key={lead.business_name} lead={lead} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No leads match this filter.
              </div>
            )}
          </div>
        </>
      )}

      {!searched && (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Run a search to see leads in your city.</p>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: GeneratedLead }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleOpenWhatsApp = () => {
    const url = whatsappLink(lead.phone, generatePitch(lead.niche, lead.business_name));
    window.open(url, "_blank");
  };

  const handleCopyLink = async () => {
    const url = whatsappLink(lead.phone, generatePitch(lead.niche, lead.business_name));
    await navigator.clipboard.writeText(url);
    toast.success("WhatsApp link copied");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("saved_leads").insert({
      user_id: user.id,
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
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save lead");
      return;
    }
    toast.success("Lead saved");
  };

  const waColor = lead.whatsapp_score >= 80 ? "bg-success" : lead.whatsapp_score >= 55 ? "bg-warning" : "bg-muted-foreground";

  return (
    <article className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{lead.business_name}</h3>
          <p className="text-xs text-muted-foreground">{lead.niche} · {lead.city}, {lead.country}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-2xl font-semibold tabular-nums">{lead.lead_score}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead score</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 hover:bg-secondary/70">
            <Globe className="h-3 w-3" /> Website
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-destructive">No website</span>
        )}
        {lead.phone && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
            <Phone className="h-3 w-3" /> {lead.phone}
          </span>
        )}
        {lead.instagram && (
          <a href={lead.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 hover:bg-secondary/70">
            <Instagram className="h-3 w-3" />
          </a>
        )}
        {lead.facebook && (
          <a href={lead.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 hover:bg-secondary/70">
            <Facebook className="h-3 w-3" />
          </a>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">★ {lead.reviews_estimate} reviews</span>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className={"h-1.5 w-1.5 rounded-full " + waColor} />
            {lead.whatsapp_label}
          </span>
          <span className="text-muted-foreground">{lead.whatsapp_score}/100 · {lead.number_validity}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
          <div className={"h-full " + waColor} style={{ width: `${lead.whatsapp_score}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <div>
          <span className="font-semibold">Recommended:</span> {lead.recommended_service}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
          onClick={handleOpenWhatsApp}
          disabled={!lead.phone}
        >
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Open WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopyLink} disabled={!lead.phone}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
        </Button>
        <PitchGenerator lead={lead} />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          <Bookmark className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </article>
  );
}
