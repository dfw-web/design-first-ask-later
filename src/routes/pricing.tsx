import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — NaijaClientr" },
      { name: "description", content: "Simple, transparent pricing for freelancers and agencies. Free trial available — no credit card required." },
      { property: "og:title", content: "Pricing — NaijaClientr" },
      { property: "og:description", content: "Free Trial, Starter, Pro, and Agency plans built for African freelancers and agencies." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Free Trial",
    price: "₦0",
    period: "for 7 days",
    desc: "Test the waters with no commitment.",
    features: ["10 searches total", "Basic lead data", "WhatsApp deep links", "Single user"],
    cta: "Start free",
  },
  {
    name: "Starter",
    price: "₦7,900",
    period: "per month",
    desc: "For solo freelancers getting started.",
    features: ["100 searches / month", "Lead scoring", "WhatsApp Ready scoring", "CSV export"],
    cta: "Choose Starter",
  },
  {
    name: "Pro",
    price: "₦14,900",
    period: "per month",
    desc: "For serious freelancers and consultants.",
    featured: true,
    features: [
      "Unlimited searches",
      "AI pitch generator",
      "Full CRM + pipeline",
      "PDF reports",
      "Priority email support",
    ],
    cta: "Start free trial",
  },
  {
    name: "Agency",
    price: "₦39,900",
    period: "per month",
    desc: "For agencies and growing teams.",
    features: [
      "Everything in Pro",
      "5 team seats",
      "Bulk outreach (20 at once)",
      "Affiliate dashboard",
      "Dedicated success manager",
    ],
    cta: "Contact sales",
  },
];

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 pt-20 pb-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">Pricing</p>
          <h1 className="mt-2 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            Pricing that scales with you.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            Start free. Upgrade when you close your first client. Cancel anytime.
          </p>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={
                  "flex flex-col rounded-2xl border p-6 " +
                  (t.featured
                    ? "border-foreground bg-foreground text-background shadow-glow"
                    : "border-border bg-card")
                }
              >
                <div className="text-sm font-medium">{t.name}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{t.price}</span>
                </div>
                <div className={"text-xs " + (t.featured ? "text-background/70" : "text-muted-foreground")}>{t.period}</div>
                <p className={"mt-3 text-sm " + (t.featured ? "text-background/80" : "text-muted-foreground")}>{t.desc}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={"mt-6 w-full " + (t.featured ? "bg-background text-foreground hover:bg-background/90" : "")}
                  variant={t.featured ? "default" : "outline"}
                >
                  <Link to="/signup">{t.cta}</Link>
                </Button>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            All plans include 14-day money-back guarantee. Prices in NGN — USD billing available at checkout.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
