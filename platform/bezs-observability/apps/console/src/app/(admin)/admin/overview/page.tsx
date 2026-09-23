// Admin overview — platform-wide stats: total users, orgs, events today,
// error rate, plus recent signups and new organisations.
"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Activity, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface StatsData {
  userCount: number;
  orgCount: number;
  eventsToday: number;
  errorsToday: number;
  recentOrgs: { id: string; name: string; slug: string; createdAt: string }[];
  recentUsers: { id: string; name: string; email: string; createdAt: string; role: string | null }[];
}

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  loading: boolean;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className={`rounded-md p-2 ${color ?? "bg-muted"}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-6 w-16 mb-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const errorRate =
    data && data.eventsToday > 0
      ? ((data.errorsToday / data.eventsToday) * 100).toFixed(1) + "%"
      : "0%";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">
          Real-time platform health across all organisations
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total users"
          value={formatNum(data?.userCount ?? 0)}
          loading={isLoading}
          color="bg-blue-100 dark:bg-blue-950/40"
        />
        <StatCard
          icon={Building2}
          label="Organisations"
          value={formatNum(data?.orgCount ?? 0)}
          loading={isLoading}
          color="bg-purple-100 dark:bg-purple-950/40"
        />
        <StatCard
          icon={Activity}
          label="Events today"
          value={formatNum(data?.eventsToday ?? 0)}
          loading={isLoading}
          color="bg-green-100 dark:bg-green-950/40"
        />
        <StatCard
          icon={AlertTriangle}
          label="Error rate today"
          value={errorRate}
          loading={isLoading}
          color={
            parseFloat(errorRate) > 5
              ? "bg-red-100 dark:bg-red-950/40"
              : "bg-muted"
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent signups</CardTitle>
            <CardDescription>Last 5 users to join the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-44" />
                    </div>
                  </div>
                ))
              : data?.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {u.role && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {u.role}
                      </Badge>
                    )}
                  </div>
                ))}
          </CardContent>
        </Card>

        {/* Recent orgs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">New organisations</CardTitle>
            <CardDescription>Last 5 organisations created</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-20 ml-auto" />
                  </div>
                ))
              : data?.recentOrgs.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.slug}</p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
