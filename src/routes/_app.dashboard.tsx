import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Globe, Phone, Instagram, Facebook, MessageCircle, Sparkles, Bookmark, Copy, Loader2, Info, MapPin, ExternalLink, Mail, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { searchLeads, whatsappLink, generatePitch, generateEmailPitch, mailtoLink, type Lead } from "@/lib/leads";
import type { LeadSourceId } from "@/lib/leads/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { saveLocalLead } from "@/lib/leads/storage";
import { leadsToCsv, downloadCsv } from "@/lib/leads/export";
import { toast } from "sonner";
import { PitchGenerator } from "@/components/PitchGenerator";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const NICHES = ["dentist", "hotel", "restaurant", "salon", "lawyer", "church", "school", "boutique", "hospital"];
const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "Egypt"];

type Filter =
  | "all"
  | "no-website"
  | "has-phone"
  | "has-email"
  | "has-whatsapp"
  | "high-score"
  | "low-reviews"
  | "no-social"
  | "wa-ready"
  | "hot"
  | "medium"
  | "low";

const SOURCE_LABEL: Record<LeadSourceId, string> = {
  mock: "Demo data",
  openstreetmap: "OpenStreetMap",
};

function DashboardPage() {
  const [niche, setNiche] = useState("dentist");
  const [city, setCity] = useState("Lagos");
  const [country, setCountry] = useState("Nigeria");
  const [results, setResults] = useState<Lead[]>([]);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<LeadSourceId>("mock");
  const [isDemo, setIsDemo] = useState(false);
  const [notice, setNotice] = useState<string | undefined>();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !city.trim()) return;
    setLoading(true);
    setFilter("all");
    try {
      const res = await searchLeads({ niche, city, country, limit: 12 });
      setResults(res.leads);
      setSource(res.source);
      setIsDemo(res.isDemo);
      setNotice(res.notice);
      setSearched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
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
            <Button type="submit" className="w-full md:w-auto" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>
        </div>
      </form>

      {searched && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{filtered.length} leads found</h2>
                <span
                  className={
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " +
                    (isDemo
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-success/40 bg-success/10 text-success")
                  }
                  title={notice}
                >
                  {SOURCE_LABEL[source]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{niche} · {city}, {country}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Powered by{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-foreground"
                  >
                    OpenStreetMap
                  </a>
                </span>
                <span aria-hidden>·</span>
                <span>
                  Built by{" "}
                  <a
                    href="https://nexloftdigital.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline hover:text-foreground"
                  >
                    Nexloft Digital
                  </a>
                </span>
              </div>
              {notice && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" /> {notice}
                </p>
              )}
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
              <LeadCard key={lead.source_id ?? lead.business_name} lead={lead} />
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

function LeadCard({ lead }: { lead: Lead }) {
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
    if (!user) {
      toast.info("Sign in to save leads to your account");
      return;
    }
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

  const qualityColor =
    lead.quality_label === "Hot Lead"
      ? "border-success/50 bg-success/10 text-success"
      : lead.quality_label === "Medium Opportunity"
        ? "border-warning/50 bg-warning/10 text-warning"
        : "border-border bg-muted text-muted-foreground";

  const handleCopyContact = async () => {
    const lines = [
      lead.business_name,
      lead.phone ? `Phone: ${lead.phone}` : null,
      lead.email ? `Email: ${lead.email}` : null,
      lead.website ? `Website: ${lead.website}` : null,
      `Maps: ${lead.maps_url}`,
    ].filter(Boolean);
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Contact copied");
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{lead.business_name}</h3>
          <p className="text-xs text-muted-foreground">
            {lead.location_type ?? lead.niche} · {lead.city}, {lead.country}
          </p>
          {lead.address && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground/80">{lead.address}</p>
          )}
          <p className="mt-1.5 text-xs text-foreground/80 italic">{lead.opportunity_reason}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-2xl font-semibold tabular-nums leading-none">{lead.lead_score}</div>
          <span className={"rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " + qualityColor}>
            {lead.quality_label}
          </span>
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
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 hover:bg-secondary/70">
            <Mail className="h-3 w-3" /> Email
          </a>
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
        {lead.reviews_estimate > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">★ {lead.reviews_estimate} reviews</span>
        )}
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
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={lead.maps_url} target="_blank" rel="noreferrer">
            <MapPin className="mr-1.5 h-3.5 w-3.5" /> Maps
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Find more
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <a href={lead.find_more.google} target="_blank" rel="noreferrer">Google Search</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={lead.find_more.maps} target="_blank" rel="noreferrer">Google Maps</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={lead.find_more.instagram} target="_blank" rel="noreferrer">Instagram</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={handleCopyLink} disabled={!lead.phone}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopyContact}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy contact
        </Button>
        <PitchGenerator lead={lead} />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          <Bookmark className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Source: {lead.source === "openstreetmap" ? "OpenStreetMap" : "Demo"}</span>
        <span>Found {new Date(lead.found_at).toLocaleDateString()}</span>
      </div>
    </article>
  );
}
