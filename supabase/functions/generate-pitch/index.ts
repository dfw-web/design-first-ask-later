// Edge function: generate-pitch
// Uses Lovable AI Gateway to generate channel- and tone-specific outreach pitches.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Channel = "whatsapp" | "email" | "instagram" | "followup_day2" | "followup_day5" | "followup_final";
type Tone = "professional" | "friendly" | "bold" | "high_ticket";

interface Body {
  channel: Channel;
  tone: Tone;
  business_name: string;
  niche: string;
  city: string;
  country?: string;
  website?: string | null;
  website_quality_score?: number;
  reviews_estimate?: number;
  recommended_service?: string;
  whatsapp_label?: string;
}

const CHANNEL_BRIEFS: Record<Channel, string> = {
  whatsapp:
    "Write a WhatsApp opener. Max 350 characters. Conversational, no subject line. End with a soft question that invites a reply. No links unless essential.",
  email:
    "Write a cold email. Output exactly: 'Subject: <line>' on the first line, then a blank line, then the body (max 130 words). Include a clear single CTA. No emojis unless tone is friendly.",
  instagram:
    "Write an Instagram DM. Max 280 characters. Reference something visual or social-proof related (their feed, posts, branding). Casual, ends with a light question.",
  followup_day2:
    "Write a Day-2 follow-up message (assume initial WhatsApp/email was sent 2 days ago, no reply). Max 280 characters. Add one new value point or insight. Do NOT apologize for following up.",
  followup_day5:
    "Write a Day-5 follow-up. Max 280 characters. Reframe the offer with a concrete result/number relevant to their niche. Light urgency.",
  followup_final:
    "Write a final 'breakup' bump message. Max 220 characters. Polite, low-pressure, leaves the door open. Single sentence question at the end.",
};

const TONE_BRIEFS: Record<Tone, string> = {
  professional: "Tone: professional, polished, respectful. No slang. No emojis.",
  friendly: "Tone: warm, friendly, human. Light emoji ok (max 1). Conversational.",
  bold: "Tone: bold, direct, confident. Lead with a strong hook. No fluff. No emojis.",
  high_ticket:
    "Tone: high-ticket agency. Speak like a senior consultant for a $5k+/mo retainer. Reference business outcomes (revenue, bookings, LTV). Calm authority. No emojis.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const channelBrief = CHANNEL_BRIEFS[body.channel];
    const toneBrief = TONE_BRIEFS[body.tone];

    const context = [
      `Business: ${body.business_name}`,
      `Niche: ${body.niche}`,
      `Location: ${body.city}${body.country ? ", " + body.country : ""}`,
      body.website ? `Website: ${body.website} (quality score ${body.website_quality_score ?? "?"} /100)` : "Website: none",
      `Reviews: ~${body.reviews_estimate ?? 0}`,
      body.recommended_service ? `Recommended service: ${body.recommended_service}` : "",
      body.whatsapp_label ? `WhatsApp signal: ${body.whatsapp_label}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const system = `You are an elite cold-outreach copywriter for a digital marketing agency targeting African SMBs (Nigeria, Ghana, Kenya, etc.). You write messages that feel personal, never templated. You never use placeholders like [name] or [city]. Output ONLY the message content — no preamble, no explanations, no quotes around the message.`;

    const user = `${channelBrief}\n\n${toneBrief}\n\nLead context:\n${context}\n\nWrite the message now.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const message = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pitch error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
