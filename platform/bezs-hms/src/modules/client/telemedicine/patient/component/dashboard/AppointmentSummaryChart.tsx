/**
 * AppointmentSummaryChart — radial bar chart summarising appointment statuses.
 *
 * Layer: client / telemedicine / patient / component / dashboard
 *
 * Shows three concentric arcs: total (background), pending, and completed.
 * Percentage labels and counts are displayed below the chart. A Users icon
 * is centred inside the radial rings.
 *
 * Uses Recharts RadialBarChart with CSS variable fill colours so it adapts
 * to light/dark mode automatically.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Users } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentSummaryChartProps {
  /** Count of pending + booked appointments. */
  pending: number;
  /** Count of fulfilled appointments. */
  completed: number;
  /** Total appointment count. */
  total: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Radial bar chart showing pending vs completed appointments as proportional arcs.
 * Displays percentage breakdowns below the chart.
 *
 * @param pending - Number of active/booked appointments.
 * @param completed - Number of fulfilled appointments.
 * @param total - Total appointments (used for the background arc).
 */
export function AppointmentSummaryChart({
  pending,
  completed,
  total,
}: AppointmentSummaryChartProps) {
  const chartData = [
    { name: "Total", count: total, fill: "var(--card)" },
    { name: "Pending", count: pending, fill: "var(--foreground)" },
    { name: "Completed", count: completed, fill: "var(--primary)" },
  ];

  const activeDenominator = pending + completed || 1;
  const pendingPct = Math.round((pending / activeDenominator) * 100);
  const completedPct = Math.round((completed / activeDenominator) * 100);

  return (
    <Card className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-base font-semibold">Appointments Summary</h2>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-xs h-auto p-0 font-normal opacity-70 hover:opacity-100 hover:bg-transparent hover:underline"
        >
          <Link href="/bezs/telemedicine/patient/appointments">See details</Link>
        </Button>
      </div>

      {/* Radial chart */}
      <div className="relative flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="100%"
            barSize={28}
            data={chartData}
          >
            <RadialBar
              background={{ fill: "var(--border)" }}
              dataKey="count"
              cornerRadius={999}
              isAnimationActive
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Centre icon */}
        <Users
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground"
          size={36}
        />
      </div>

      {/* Legend / percentages */}
      <div className="flex justify-center gap-8 mt-3 shrink-0">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: "var(--foreground)" }}
            />
            <span className="font-semibold text-sm tabular-nums">{pending}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Pending ({pendingPct}%)
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: "var(--primary)" }}
            />
            <span className="font-semibold text-sm tabular-nums">{completed}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Completed ({completedPct}%)
          </span>
        </div>
      </div>
    </Card>
  );
}
