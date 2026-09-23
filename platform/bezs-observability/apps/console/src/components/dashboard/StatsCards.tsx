// StatsCards — the four metric summary cards at the top of the overview page.
// Renders data returned from the /api/events/overview route.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Users, Layers } from "lucide-react";
import type { OverviewStats } from "@/lib/clickhouse";

interface StatsCardsProps {
  stats: OverviewStats;
}

// StatsCards renders a row of four KPI cards showing 24-hour aggregate counts.
export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Events",
      value: stats.total_events.toLocaleString(),
      sub: "last 24 h",
      icon: Activity,
    },
    {
      label: "Errors",
      value: stats.error_count.toLocaleString(),
      sub: `${stats.total_events > 0 ? ((stats.error_count / stats.total_events) * 100).toFixed(1) : 0}% error rate`,
      icon: AlertTriangle,
      danger: stats.error_count > 0,
    },
    {
      label: "Active Users",
      value: stats.unique_users.toLocaleString(),
      sub: "unique user IDs",
      icon: Users,
    },
    {
      label: "Applications",
      value: stats.unique_apps.toLocaleString(),
      sub: "distinct app IDs",
      icon: Layers,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, sub, icon: Icon, danger }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon
              className={`h-4 w-4 ${danger ? "text-destructive" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${danger ? "text-destructive" : ""}`}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
