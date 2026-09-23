"use client";

// ErrorRateGauge — radial gauge showing the 24-hour error rate percentage.
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OverviewStats } from "@/lib/clickhouse";

interface ErrorRateGaugeProps {
  stats: OverviewStats;
}

export function ErrorRateGauge({ stats }: ErrorRateGaugeProps) {
  const rate =
    stats.total_events > 0
      ? Math.round((stats.error_count / stats.total_events) * 1000) / 10
      : 0;

  const isHighRate = rate > 5;
  const fill = isHighRate ? "var(--destructive)" : "var(--chart-1)";

  // RadialBar expects a value 0-100 on the `value` key
  const chartData = [{ value: Math.min(rate, 100), fill }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Error rate</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-2">
        <div className="relative h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="65%"
              outerRadius="100%"
              data={chartData}
              startAngle={210}
              endAngle={-30}
              barSize={14}
            >
              {/* Track ring */}
              <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Centre label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold tabular-nums ${isHighRate ? "text-destructive" : ""}`}>
              {rate}%
            </span>
            <span className="text-xs text-muted-foreground">24 h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
