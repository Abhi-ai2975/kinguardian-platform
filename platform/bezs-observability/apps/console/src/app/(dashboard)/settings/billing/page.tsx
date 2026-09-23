// Billing settings — shows current plan, monthly usage meter, and upgrade/portal actions.
"use client";

import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  CreditCard,
  Zap,
  ArrowUpRight,
  ExternalLink,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "yearly";

type Subscription = {
  id: string;
  plan: string;
  status: string;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
};

type UsageData = {
  count: number;
  limit: number;
  plan: string;
  percentage: number;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  canceled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  past_due: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  incomplete: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function formatLimit(n: number): string {
  if (n === -1) return "Unlimited";
  return formatCount(n);
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const result = await authClient.subscription.list();
      const subs = (result.data ?? []) as Subscription[];
      return subs[0] ?? null;
    },
  });

  const activePlan = subData?.plan ?? "free";

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["billing-usage", activePlan],
    queryFn: async () => {
      const res = await fetch(`/api/billing/usage?plan=${activePlan}`);
      return res.json() as Promise<UsageData>;
    },
    enabled: !subLoading,
  });

  async function handleUpgrade(plan: "pro" | "enterprise") {
    const origin = window.location.origin;
    const result = await authClient.subscription.upgrade({
      plan,
      annual: billing === "yearly",
      successUrl: `${origin}/settings/billing?upgraded=true`,
      cancelUrl: `${origin}/settings/billing`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to start checkout");
      return;
    }
    const url = (result.data as { url?: string })?.url;
    if (url) window.location.href = url;
  }

  async function handlePortal() {
    const origin = window.location.origin;
    const result = await authClient.subscription.billingPortal({
      returnUrl: `${origin}/settings/billing`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to open billing portal");
      return;
    }
    const url = (result.data as { url?: string })?.url;
    if (url) window.location.href = url;
  }

  async function handleCancel() {
    const origin = window.location.origin;
    const result = await authClient.subscription.cancel({
      returnUrl: `${origin}/settings/billing`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to cancel subscription");
    } else {
      toast.success("Subscription cancelled — active until period end");
    }
  }

  const isLoading = subLoading || usageLoading;
  const isPaid = activePlan !== "free";
  const isWarning = (usage?.percentage ?? 0) >= 80;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, usage, and payment details
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Current plan
            </CardTitle>
            {!isLoading && subData?.status && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[subData.status] ?? STATUS_COLORS.incomplete}`}
              >
                {subData.status.replace("_", " ")}
              </span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <CardDescription>
              {subData?.cancelAtPeriodEnd
                ? "Cancels at end of billing period"
                : subData?.periodEnd
                  ? `Renews ${new Date(subData.periodEnd).toLocaleDateString()}`
                  : "No active subscription"}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">
                {PLAN_LABELS[activePlan] ?? activePlan}
              </span>
              {activePlan === "free" && (
                <span className="text-sm text-muted-foreground mb-1">— $0/month</span>
              )}
              {activePlan === "pro" && (
                <span className="text-sm text-muted-foreground mb-1">
                  — {billing === "yearly" ? "$24/mo · billed $290/yr" : "$29/month"}
                </span>
              )}
              {activePlan === "enterprise" && (
                <span className="text-sm text-muted-foreground mb-1">
                  — {billing === "yearly" ? "$82/mo · billed $990/yr" : "$99/month"}
                </span>
              )}
            </div>
          )}

          {/* Billing period toggle — only shown when not on free plan or when upgrading */}
          {activePlan === "free" && !isLoading && (
            <div className="flex items-center gap-1 w-fit rounded-lg border bg-muted/40 p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
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
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                  billing === "yearly"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yearly
                <span className="rounded px-1 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Save 17%
                </span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {activePlan === "free" && (
              <Button size="sm" onClick={() => handleUpgrade("pro")}>
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Upgrade to Pro
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href="/settings/billing/plans">
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                Compare plans
              </Link>
            </Button>
            {isPaid && !subData?.cancelAtPeriodEnd && (
              <Button size="sm" variant="outline" onClick={handlePortal}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Manage billing
              </Button>
            )}
            {isPaid && !subData?.cancelAtPeriodEnd && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleCancel}
              >
                Cancel plan
              </Button>
            )}
            {subData?.cancelAtPeriodEnd && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const r = await authClient.subscription.restore();
                  if (r.error) toast.error(r.error.message ?? "Failed to restore");
                  else toast.success("Subscription restored");
                }}
              >
                Restore subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Meter */}
      <Card className={isWarning ? "border-yellow-400/60" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {isWarning && (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            Monthly usage
          </CardTitle>
          <CardDescription>
            Events ingested this calendar month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {formatCount(usage?.count ?? 0)} events
                </span>
                <span className="text-muted-foreground">
                  {usage?.limit === -1
                    ? "Unlimited"
                    : `of ${formatLimit(usage?.limit ?? 100_000)}`}
                </span>
              </div>

              {usage?.limit !== -1 && (
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (usage?.percentage ?? 0) >= 90
                        ? "bg-red-500"
                        : (usage?.percentage ?? 0) >= 80
                          ? "bg-yellow-500"
                          : "bg-primary"
                    }`}
                    style={{ width: `${usage?.percentage ?? 0}%` }}
                  />
                </div>
              )}

              {isWarning && activePlan === "free" && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  You&apos;re at {usage?.percentage}% of your free tier limit.
                  <button
                    className="underline font-medium"
                    onClick={() => handleUpgrade("pro")}
                  >
                    Upgrade to Pro
                  </button>
                  to avoid disruption.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA (only for free) */}
      {!isLoading && activePlan === "free" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Need more events?
            </CardTitle>
            <CardDescription>
              Pro gives you 5M events/month, 90-day retention, and 20 team members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1 w-fit rounded-lg border bg-background p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  billing === "monthly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                  billing === "yearly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yearly
                <span className="rounded px-1 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Save 17%
                </span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleUpgrade("pro")}>
                <ArrowUpRight className="mr-1.5 h-4 w-4" />
                {billing === "yearly"
                  ? "Upgrade to Pro — $24/mo · $290/yr"
                  : "Upgrade to Pro — $29/month"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/settings/billing/plans">
                  <LayoutGrid className="mr-1.5 h-4 w-4" />
                  Compare all plans
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
