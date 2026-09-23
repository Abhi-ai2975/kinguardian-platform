"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "yearly";

interface Plan {
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlySub?: string;
  per?: string;
  highlighted: boolean;
  cta: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    name: "Free",
    description: "Perfect for side projects and experimentation.",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    per: "/ month",
    highlighted: false,
    cta: "Get started",
    features: [
      "Up to 100k events / month",
      "7-day log retention",
      "1 organisation · 1 team",
      "Up to 3 members per team",
      "Community support",
      "2 secret API keys · 2 public tokens",
      "JavaScript & Python SDKs",
    ],
  },
  {
    name: "Pro",
    description: "For growing teams shipping production software.",
    monthlyPrice: "$29",
    yearlyPrice: "$24",
    yearlySub: "billed $290 / yr",
    per: "/ month",
    highlighted: true,
    cta: "Start Pro trial",
    features: [
      "Up to 5M events / month",
      "90-day log retention",
      "Up to 5 organisations · 10 teams",
      "Up to 20 members per team",
      "Priority email support",
      "20 secret API keys · 10 public tokens",
      "All SDKs + OpenTelemetry",
      "Custom dashboards",
      "Audit log exports",
    ],
  },
  {
    name: "Enterprise",
    description: "Dedicated infrastructure and SLA guarantees.",
    monthlyPrice: "$99",
    yearlyPrice: "$82",
    yearlySub: "billed $990 / yr",
    per: "/ month",
    highlighted: false,
    cta: "Upgrade to Enterprise",
    features: [
      "Unlimited events",
      "1-year retention",
      "Unlimited organisations & teams",
      "Unlimited API keys & public tokens",
      "SSO / SAML",
      "Dedicated support SLA",
      "On-prem deployment option",
      "Security review & MSA",
    ],
  },
];

interface PricingSectionProps {
  isAuthenticated: boolean;
}

export function PricingSection({ isAuthenticated }: PricingSectionProps) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  function ctaHref(plan: Plan) {
    if (!isAuthenticated) return "/login";
    if (plan.name === "Free") return "/overview";
    return `/settings/billing/plans?billing=${billing}`;
  }

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free. Scale when you need to. No surprise bills.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                billing === "monthly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                billing === "yearly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => {
            const price = billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const sub = billing === "yearly" && plan.yearlySub ? plan.yearlySub : plan.per;
            return (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-primary shadow-lg shadow-primary/10 bg-primary/5"
                    : "bg-card"
                }`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most popular
                  </Badge>
                )}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-3xl font-bold">{price}</span>
                    {plan.per && (
                      <span className="text-sm text-muted-foreground">
                        {plan.per}
                      </span>
                    )}
                  </div>
                  {billing === "yearly" && plan.yearlySub && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.yearlySub}
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                >
                  <Link href={ctaHref(plan)}>{plan.cta}</Link>
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          All plans include audit logs and real-time streaming.{" "}
          <Link
            href="/docs"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Compare all features →
          </Link>
        </p>
      </div>
    </section>
  );
}
