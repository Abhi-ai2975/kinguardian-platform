"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Globe, Building2, TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  trend: string;
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        <div className="mt-3 flex items-center gap-1 text-xs text-green-500">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardsProps {
  userCount: number;
  sessionCount: number;
  oauthClientCount: number;
  orgCount: number;
}

export function StatCards({
  userCount,
  sessionCount,
  oauthClientCount,
  orgCount,
}: StatCardsProps) {
  const stats: StatCardProps[] = [
    {
      title: "Total Users",
      value: userCount,
      description: "Registered accounts",
      icon: Users,
      trend: "+12% from last month",
    },
    {
      title: "Active Sessions",
      value: sessionCount,
      description: "Currently authenticated",
      icon: Activity,
      trend: "+4% from yesterday",
    },
    {
      title: "OAuth Clients",
      value: oauthClientCount,
      description: "Registered applications",
      icon: Globe,
      trend: "+1 this month",
    },
    {
      title: "Organizations",
      value: orgCount,
      description: "Active tenants",
      icon: Building2,
      trend: "+2 this quarter",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.title} {...s} />
      ))}
    </div>
  );
}
