/**
 * AppointmentBarChart — monthly appointments bar chart for the patient dashboard.
 *
 * Layer: client / telemedicine / patient / component / dashboard
 *
 * Shows two bars per month: total booked (muted) and completed (primary).
 * Uses Recharts ResponsiveContainer so the card fills its container height.
 * Tooltip and legend are styled with CSS variables so they adapt to dark mode.
 */

"use client";

import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  Legend,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

/** One data point per month shown in the chart. */
export interface AppointmentBarChartData {
  /** Short month label, e.g. "Jan", "Feb". */
  name: string;
  /** Total appointments booked that month. */
  booked: number;
  /** Appointments marked fulfilled that month. */
  completed: number;
}

interface AppointmentBarChartProps {
  /** Monthly time-series data (last N months). */
  data: AppointmentBarChartData[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a dual-bar chart inside a card with a 90%-height ResponsiveContainer.
 * Booked appointments are shown in muted foreground; completed in primary.
 *
 * @param data - Array of monthly data points.
 */
export function AppointmentBarChart({ data }: AppointmentBarChartProps) {
  return (
    <Card className="rounded-xl p-4 h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold">Appointments</h2>
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} barSize={20}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />

          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />

          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "0.5rem",
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />

          <Legend
            align="left"
            verticalAlign="top"
            wrapperStyle={{
              paddingTop: "12px",
              paddingBottom: "24px",
              textTransform: "capitalize",
              color: "var(--foreground)",
              fontSize: 13,
            }}
          />

          <Bar
            dataKey="booked"
            name="Booked"
            fill="var(--muted-foreground)"
            legendType="circle"
            radius={[6, 6, 0, 0]}
          />

          <Bar
            dataKey="completed"
            name="Completed"
            fill="var(--primary)"
            legendType="circle"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
