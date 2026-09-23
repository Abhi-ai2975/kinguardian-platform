// Overview page — dashboard home.
// Reads the `range` search param (default "24h") to scope all ClickHouse queries.
// The DateRangePicker client component writes to the URL; Next.js re-renders this
// server component with the new searchParam on each change.
import { getServerSession } from "@/lib/auth-server";
import {
  queryOverviewStats,
  queryHourlyBuckets,
  queryGeoDistribution,
} from "@/lib/clickhouse";
import {
  resolveTimeRange,
  isValidRange,
  DEFAULT_RANGE,
  TIME_RANGE_PRESETS,
  type TimeRangeKey,
} from "@/lib/time-range";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { EventsTrendChart } from "@/components/dashboard/EventsTrendChart";
import { EventTypeBreakdownChart } from "@/components/dashboard/EventTypeBreakdownChart";
import { ErrorRateGauge } from "@/components/dashboard/ErrorRateGauge";
import { GlobalUsersMap } from "@/components/dashboard/GlobalUsersMap";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? "";

  const sp = await searchParams;
  const rangeKey = isValidRange(sp.range ?? "") ? (sp.range as TimeRangeKey) : DEFAULT_RANGE;
  const { from, to } = resolveTimeRange(rangeKey);
  const rangeLabel = TIME_RANGE_PRESETS[rangeKey].label;

  const [stats, buckets, geoCounts] = await Promise.all([
    queryOverviewStats(orgId, { from, to }),
    queryHourlyBuckets(orgId, { from, to }),
    queryGeoDistribution(orgId, { from, to }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <DateRangePicker />
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EventsTrendChart data={buckets} title={`Events · ${rangeLabel}`} />
        </div>
        <div className="lg:col-span-1">
          <EventTypeBreakdownChart stats={stats} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ErrorRateGauge stats={stats} />
        </div>
        <div className="lg:col-span-2">
          <LiveFeed />
        </div>
      </div>

      <GlobalUsersMap data={geoCounts} />
    </div>
  );
}
