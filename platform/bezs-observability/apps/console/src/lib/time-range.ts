// time-range.ts — shared preset definitions and resolver used by both server
// components (searchParams) and client components (nuqs URL state).
export const TIME_RANGE_PRESETS = {
  "15m": { label: "Last 15 min", minutes: 15 },
  "1h":  { label: "Last 1 hour",  minutes: 60 },
  "4h":  { label: "Last 4 hours", minutes: 240 },
  "24h": { label: "Last 24 hours",minutes: 1440 },
  "7d":  { label: "Last 7 days",  minutes: 10_080 },
  "30d": { label: "Last 30 days", minutes: 43_200 },
} as const;

export type TimeRangeKey = keyof typeof TIME_RANGE_PRESETS;

export const DEFAULT_RANGE: TimeRangeKey = "24h";

// toClickHouseDateTime formats a Date as "YYYY-MM-DD HH:MM:SS.mmm" which
// ClickHouse DateTime64(3) accepts.  The ISO "T" separator and trailing "Z"
// are intentionally removed — ClickHouse rejects them.
function toClickHouseDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").replace("Z", "");
}

// resolveTimeRange converts a range key into ClickHouse-compatible timestamps.
// Called in server components from searchParams and in API routes.
export function resolveTimeRange(range: string): { from: string; to: string } {
  const preset = TIME_RANGE_PRESETS[range as TimeRangeKey];
  const minutes = preset?.minutes ?? TIME_RANGE_PRESETS[DEFAULT_RANGE].minutes;
  const now = new Date();
  return {
    from: toClickHouseDateTime(new Date(now.getTime() - minutes * 60 * 1000)),
    to: toClickHouseDateTime(now),
  };
}

// isValidRange checks whether a string is a known preset key.
export function isValidRange(range: string): range is TimeRangeKey {
  return range in TIME_RANGE_PRESETS;
}
