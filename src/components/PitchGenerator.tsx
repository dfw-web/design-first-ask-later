import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, RefreshCw, Loader2, MessageCircle, Mail, Instagram, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappLink, type GeneratedLead } from "@/lib/leadGenerator";
import { toast } from "sonner";

type Channel = "whatsapp" | "email" | "instagram" | "followup_day2" | "followup_day5" | "followup_final";
type Tone = "professional" | "friendly" | "bold" | "high_ticket";

const CHANNELS: { key: Channel; label: string; icon: React.ComponentType<{ className?: string }>; group: "outreach" | "followup" }[] = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, group: "outreach" },
  { key: "email", label: "Email", icon: Mail, group: "outreach" },
  { key: "instagram", label: "Instagram DM", icon: Instagram, group: "outreach" },
  { key: "followup_day2", label: "Day 2", icon: Clock, group: "followup" },
  { key: "followup_day5", label: "Day 5", icon: Clock, group: "followup" },
  { key: "followup_final", label: "Final bump", icon: Clock, group: "followup" },
];

const TONES: { key: Tone; label: string }[] = [
  { key: "professional", label: "Professional" },
  { key: "friendly", label: "Friendly" },
  { key: "bold", label: "Bold" },
  { key: "high_ticket", label: "High-ticket" },
];

export function PitchGenerator({ lead }: { lead: GeneratedLead }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [tone, setTone] = useState<Tone>("friendly");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // cache by channel+tone so users can switch without losing prior generations
  const [cache, setCache] = useState<Record<string, string>>({});

  const cacheKey = `${channel}:${tone}`;

  const generate = async (force = false) => {
    if (!force && cache[cacheKey]) {
      setMessage(cache[cacheKey]);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-pitch", {
        body: {
          channel,
          tone,
          business_name: lead.business_name,
          niche: lead.niche,
          city: lead.city,
          country: lead.country,
          website: lead.website,
          website_quality_score: lead.website_quality_score,
          reviews_estimate: lead.reviews_estimate,
          recommended_service: lead.recommended_service,
          whatsapp_label: lead.whatsapp_label,
        },
      });
      if (error) throw error;
      const msg = (data as { message?: string; error?: string })?.message ?? "";
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) {
        toast.error(errMsg);
        return;
      }
      setMessage(msg);
      setCache((c) => ({ ...c, [cacheKey]: msg }));
    } catch (e) {
      const m = e instanceof Error ? e.message : "Could not generate pitch";
      toast.error(m);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v && !message) generate();
  };

  const handleChannel = (c: Channel) => {
    setChannel(c);
    const key = `${c}:${tone}`;
    if (cache[key]) setMessage(cache[key]);
    else setTimeout(() => generate(), 0);
  };

  const handleTone = (t: Tone) => {
    setTone(t);
    const key = `${channel}:${t}`;
    if (cache[key]) setMessage(cache[key]);
    else setTimeout(() => generate(), 0);
  };

  const handleCopy = async () => {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    toast.success("Copied to clipboard");
  };

  const handleSendWhatsApp = () => {
    if (!lead.phone) {
      toast.error("No phone number for this lead");
      return;
    }
    window.open(whatsappLink(lead.phone, message), "_blank");
  };

  const outreach = CHANNELS.filter((c) => c.group === "outreach");
  const followup = CHANNELS.filter((c) => c.group === "followup");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Pitch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Pitch — {lead.business_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="outreach" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
            <TabsTrigger value="followup">Follow-ups</TabsTrigger>
          </TabsList>

          <TabsContent value="outreach" className="mt-4">
            <ChannelRow channels={outreach} active={channel} onSelect={handleChannel} />
          </TabsContent>
          <TabsContent value="followup" className="mt-4">
            <ChannelRow channels={followup} active={channel} onSelect={handleChannel} />
          </TabsContent>
        </Tabs>

        <div className="mt-2">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tone</div>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTone(t.key)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                  (tone === t.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:text-foreground")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 min-h-[180px] rounded-xl border border-border bg-secondary/40 p-4">
          {loading ? (
            <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Crafting your pitch…
            </div>
          ) : message ? (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{message}</pre>
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted-foreground">
              Click Regenerate to start.
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleCopy} disabled={!message || loading}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
          <Button size="sm" variant="outline" onClick={() => generate(true)} disabled={loading}>
            <RefreshCw className={"mr-1.5 h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} /> Regenerate
          </Button>
          {channel === "whatsapp" && (
            <Button
              size="sm"
              className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
              onClick={handleSendWhatsApp}
              disabled={!message || loading || !lead.phone}
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Send on WhatsApp
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelRow({
  channels,
  active,
  onSelect,
}: {
  channels: { key: Channel; label: string; icon: React.ComponentType<{ className?: string }> }[];
  active: Channel;
  onSelect: (c: Channel) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {channels.map((c) => {
        const Icon = c.icon;
        const isActive = active === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
              (isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:text-foreground")
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
