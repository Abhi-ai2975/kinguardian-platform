// Plans comparison — side-by-side Free / Pro / Enterprise feature table with upgrade CTAs.
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Minus, Zap, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Subscription = {
  id: string;
  plan: string;
  status: string;
};

type BillingPeriod = "monthly" | "yearly";

const PLAN_PRICING: Record<string, Record<BillingPeriod, { price: string; sub: string }>> = {
  free: {
    monthly: { price: "$0",  sub: "forever" },
    yearly:  { price: "$0",  sub: "forever" },
  },
  pro: {
    monthly: { price: "$29", sub: "per month" },
    yearly:  { price: "$24", sub: "per month, billed $290/yr" },
  },
  enterprise: {
    monthly: { price: "$99", sub: "per month" },
    yearly:  { price: "$82", sub: "per month, billed $990/yr" },
  },
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    description: "For individuals and small projects getting started.",
    cta: null,
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams that need more events and retention.",
    cta: "pro" as const,
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organisations that need unlimited scale.",
    cta: "enterprise" as const,
    highlight: false,
  },
] as const;

type FeatureValue = boolean | string;

interface Feature {
  label: string;
  free: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

const FEATURES: Feature[] = [
  { label: "Events / month",       free: "100k",       pro: "5M",          enterprise: "Unlimited" },
  { label: "Data retention",       free: "7 days",     pro: "90 days",     enterprise: "1 year" },
  { label: "Organisations",        free: "1",          pro: "5",           enterprise: "Unlimited" },
  { label: "Teams",                 free: "1",          pro: "10",          enterprise: "Unlimited" },
  { label: "Members per team",     free: "3",          pro: "20",          enterprise: "Unlimited" },
  { label: "Applications",         free: "2",          pro: "10",          enterprise: "Unlimited" },
  { label: "Secret API keys",      free: "2",          pro: "20",          enterprise: "Unlimited" },
  { label: "Public tokens",        free: "2",          pro: "10",          enterprise: "Unlimited" },
  { label: "Real-time streaming",  free: true,         pro: true,          enterprise: true },
  { label: "Audit logs",           free: true,         pro: true,          enterprise: true },
  { label: "Traces & metrics",     free: false,        pro: true,          enterprise: true },
  { label: "Custom dashboards",    free: false,        pro: true,          enterprise: true },
  { label: "Alerts & webhooks",    free: false,        pro: true,          enterprise: true },
  { label: "SSO / SAML",          free: false,        pro: false,         enterprise: true },
  { label: "Dedicated support",    free: false,        pro: false,         enterprise: true },
  { label: "SLA guarantee",        free: false,        pro: false,         enterprise: true },
];

function Cell({ value }: { value: FeatureValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-green-500 mx-auto" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
    );
  }
  return <span className="text-sm">{value}</span>;
}

export default function PlansPage() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingPeriod>(
    searchParams.get("billing") === "yearly" ? "yearly" : "monthly"
  );

  // Sync if the URL param changes (e.g. back/forward navigation)
  useEffect(() => {
    if (searchParams.get("billing") === "yearly") setBilling("yearly");
  }, [searchParams]);

  const { data: subData, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const result = await authClient.subscription.list();
      const subs = (result.data ?? []) as Subscription[];
      return subs[0] ?? null;
    },
  });

  const activePlan = subData?.plan ?? "free";

  async function handleUpgrade(plan: "pro" | "enterprise") {
    const origin = window.location.origin;
    const result = await authClient.subscription.upgrade({
      plan,
      annual: billing === "yearly",
      successUrl: `${origin}/settings/billing?upgraded=true`,
      cancelUrl: `${origin}/settings/billing/plans`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to start checkout");
      return;
    }
    const url = (result.data as { url?: string })?.url;
    if (url) window.location.href = url;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Compare plans and upgrade when you&apos;re ready
        </p>
      </div>

      {/* Billing period toggle */}
      <div className="flex items-center justify-center">
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
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Save 17%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = activePlan === plan.id;
          const pricing = PLAN_PRICING[plan.id][billing];
          return (
            <Card
              key={plan.id}
              className={
                plan.highlight
                  ? "border-primary ring-1 ring-primary/30"
                  : ""
              }
            >
              <CardHeader className="pb-3">
                {plan.highlight && (
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                    Most popular
                  </p>
                )}
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{pricing.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">
                    /{pricing.sub}
                  </span>
                </div>
                <CardDescription className="text-xs">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : plan.cta && !isLoading ? (
                  <Button
                    size="sm"
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.cta!)}
                  >
                    {plan.highlight ? (
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Upgrade to {plan.name}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-2.5 font-medium w-1/2">Feature</th>
                  <th className="text-center px-4 py-2.5 font-medium">Free</th>
                  <th className="text-center px-4 py-2.5 font-medium text-primary">Pro</th>
                  <th className="text-center px-4 py-2.5 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr
                    key={feature.label}
                    className={i % 2 === 0 ? "bg-muted/30" : ""}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {feature.label}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Cell value={feature.free} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Cell value={feature.pro} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Cell value={feature.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
