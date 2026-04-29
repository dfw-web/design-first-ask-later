import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Search, MessageCircle, Sparkles, BarChart3, Globe, Zap, Check, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NaijaClientr — Find clients in your city every day" },
      { name: "description", content: "Discover local businesses that need digital services. Lead scoring, WhatsApp outreach, and AI pitches built for freelancers and agencies in Africa." },
      { property: "og:title", content: "NaijaClientr — Find clients in your city every day" },
      { property: "og:description", content: "Discover local businesses that need digital services in Nigeria and across Africa." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero />
        <LogoStrip />
        <Features />
        <DashboardPreview />
        <Testimonials />
        <PricingPreview />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 text-center md:pt-32 md:pb-28">
        <div className="animate-in-up mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-elegant">
          <span className="flex h-1.5 w-1.5 rounded-full bg-success" />
          New: WhatsApp Ready Leads
        </div>
        <h1 className="animate-in-up mx-auto mt-6 max-w-4xl text-balance text-5xl font-semibold tracking-tight md:text-7xl">
          Find clients in your city <span className="text-muted-foreground">every day.</span>
        </h1>
        <p className="animate-in-up mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          NaijaClientr surfaces local businesses that need websites, branding, ads and SEO — with lead scores, contact info, and AI-written outreach. Built for freelancers and agencies in Nigeria and across Africa.
        </p>
        <div className="animate-in-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link to="/signup">Start free trial →</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
            <Link to="/" hash="preview">View demo</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">No credit card required · Cancel anytime</p>
      </div>
    </section>
  );
}

function LogoStrip() {
  const items = ["Lagos Agencies", "Abuja Studios", "Nairobi Freelancers", "Accra Marketers", "Cape Town Pros"];
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 py-8 text-sm text-muted-foreground">
        <span className="text-xs uppercase tracking-widest">Trusted by</span>
        {items.map((i) => (
          <span key={i} className="font-medium text-foreground/70">{i}</span>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Search, title: "Niche + city search", desc: "Type a niche and city — get a curated list of businesses that likely need your services." },
    { icon: BarChart3, title: "Lead scoring", desc: "Every lead gets a score out of 100 based on website quality, reviews, and online presence." },
    { icon: MessageCircle, title: "WhatsApp Ready leads", desc: "Validate phone numbers, score WhatsApp readiness, and open one-click chats." },
    { icon: Sparkles, title: "AI outreach", desc: "Generate personalized DMs, emails, and pitches tailored to each business niche." },
    { icon: Globe, title: "Built for Africa", desc: "Optimized for Nigerian mobile prefixes, with support across African countries." },
    { icon: Zap, title: "CRM + export", desc: "Track follow-ups, deal value, and export everything as CSV or PDF." },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground">Features</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Everything you need to close local clients.</h2>
      </div>
      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-elegant">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardPreview() {
  const leads = [
    { name: "Bright Smile Dental", city: "Lagos", score: 92, wa: "Highly likely", service: "Website redesign" },
    { name: "Palm Grove Hotel", city: "Abuja", score: 87, wa: "Likely", service: "Google Ads" },
    { name: "Olamide Boutique", city: "Ibadan", score: 78, wa: "Highly likely", service: "Instagram setup" },
    { name: "Royal Restaurant", city: "Port Harcourt", score: 71, wa: "Likely", service: "SEO + branding" },
  ];
  return (
    <section id="preview" className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">Preview</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Your next client is one search away.</h2>
        </div>
        <div className="mt-14 overflow-hidden rounded-2xl border border-border bg-background shadow-glow">
          <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-border" />
              <span className="h-3 w-3 rounded-full bg-border" />
              <span className="h-3 w-3 rounded-full bg-border" />
            </div>
            <div className="ml-4 flex flex-1 items-center gap-3 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              <span>dentist · Lagos · Nigeria</span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {leads.map((l) => (
              <div key={l.name} className="grid grid-cols-12 items-center gap-4 px-6 py-4 text-sm">
                <div className="col-span-4">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.city}, Nigeria</div>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full bg-foreground" style={{ width: `${l.score}%` }} />
                    </div>
                    <span className="text-xs font-medium">{l.score}</span>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> {l.wa}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">{l.service}</div>
                <div className="col-span-1 text-right">
                  <button className="inline-flex h-8 items-center justify-center rounded-md bg-whatsapp px-3 text-xs font-medium text-whatsapp-foreground transition-opacity hover:opacity-90">
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { quote: "I closed 3 dental clinics in my first week. The WhatsApp pitches alone are worth the price.", name: "Tunde A.", role: "Freelance designer · Lagos" },
    { quote: "We replaced our entire prospecting team with NaijaClientr. The lead scoring is scarily accurate.", name: "Amara O.", role: "Agency owner · Abuja" },
    { quote: "Finally a tool built for the African market. Mobile prefixes, local niches — it just works.", name: "Kwame B.", role: "SEO consultant · Accra" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground">Testimonials</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Loved by freelancers across Africa.</h2>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.name} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-foreground text-foreground" />
              ))}
            </div>
            <blockquote className="mt-4 text-base leading-relaxed">"{t.quote}"</blockquote>
            <figcaption className="mt-6">
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function PricingPreview() {
  const tiers = [
    { name: "Free Trial", price: "₦0", period: "7 days", features: ["10 searches", "Basic lead data", "WhatsApp links"], cta: "Start free" },
    { name: "Pro", price: "₦14,900", period: "/month", features: ["Unlimited searches", "AI pitches", "WhatsApp Ready scoring", "CRM + export"], cta: "Start free trial", featured: true },
    { name: "Agency", price: "₦39,900", period: "/month", features: ["Everything in Pro", "5 team seats", "Bulk outreach", "Priority support"], cta: "Contact sales" },
  ];
  return (
    <section id="pricing" className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">Pricing</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Simple, transparent pricing.</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={
                "rounded-2xl border p-8 " +
                (t.featured
                  ? "border-foreground bg-foreground text-background shadow-glow"
                  : "border-border bg-card")
              }
            >
              <div className="text-sm font-medium">{t.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
                <span className={"text-sm " + (t.featured ? "text-background/70" : "text-muted-foreground")}>{t.period}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={"mt-8 w-full " + (t.featured ? "bg-background text-foreground hover:bg-background/90" : "")}
                variant={t.featured ? "default" : "outline"}
              >
                <Link to="/pricing">{t.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "Where does the lead data come from?", a: "We aggregate from public business listings, maps APIs, and our own enrichment layer. We respect rate limits and platform terms." },
    { q: "Is this verified WhatsApp data?", a: "No — we estimate WhatsApp readiness based on number validity, mobile prefix matching, and consistency across sources. We never claim verification." },
    { q: "Which countries are supported?", a: "Nigeria is fully optimized. We also support Ghana, Kenya, South Africa, and other African countries with growing coverage." },
    { q: "Can I export my leads?", a: "Yes. Pro and Agency plans include CSV export, PDF reports, and bulk copy of WhatsApp deep links." },
    { q: "Do you offer refunds?", a: "Yes — 14-day money-back guarantee on all paid plans, no questions asked." },
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">FAQ</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Frequently asked questions</h2>
      </div>
      <div className="mt-12 divide-y divide-border border-y border-border">
        {faqs.map((f) => (
          <details key={f.q} className="group py-6">
            <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium">
              {f.q}
              <span className="text-2xl text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-foreground px-8 py-20 text-center text-background md:px-16">
        <div className="absolute inset-0 bg-grid opacity-10" aria-hidden />
        <h2 className="relative mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Stop chasing clients. Let them come to you.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-base text-background/70">
          Join hundreds of freelancers and agencies closing local clients every week.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 bg-background px-6 text-base text-foreground hover:bg-background/90">
            <Link to="/signup">Start free trial</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-12 px-6 text-base text-background hover:bg-background/10 hover:text-background">
            <Link to="/pricing">See pricing →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
