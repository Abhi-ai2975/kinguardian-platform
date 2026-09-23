// clickhouse.ts — singleton ClickHouse client for server-side Route Handlers.
//
// All telemetry data (events, audit logs, traces, metrics) lives in ClickHouse.
// This module provides the client and typed query helpers that Route Handlers use.
// It is server-only — never import this file from client components.
import { createClient } from "@clickhouse/client";

import { parseSearchQuery } from "./search-parser";

// Module-level singleton — Next.js hot-reloads in dev can create multiple
// instances, so we stash the client on globalThis to avoid connection pool bloat.
const globalForClickhouse = globalThis as unknown as {
  clickhouse: ReturnType<typeof createClient> | undefined;
};

export const clickhouse =
  globalForClickhouse.clickhouse ??
  createClient({
    url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    username: process.env.CLICKHOUSE_USER ?? "watcher",
    password: process.env.CLICKHOUSE_PASSWORD ?? "watcher_secret",
    database: process.env.CLICKHOUSE_DB ?? "watcher",
    clickhouse_settings: {
      // Async inserts — the dashboard is read-only, but this prevents accidental
      // blocking if someone writes a test row.
      async_insert: 0,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForClickhouse.clickhouse = clickhouse;
}

// ── Query helpers ─────────────────────────────────────────────────────────────

// EventRow is the ClickHouse schema for the `watcher.events` table.
export interface EventRow {
  organization_id: string;
  application_id: string;
  environment: string;
  event_type: string;
  severity: string;
  message: string;
  // source distinguishes where the event came from:
  // "client" = public token (wpub_) — browser, mobile, or desktop SDK
  // "server" = secret key (wt_) — @watcher/node, Python, or Go SDK
  // ""       = legacy events ingested before source tagging was added
  source: string;
  // service_name is the optional developer-set label for the sending component.
  // Examples: "payment-api", "auth-worker", "mobile-ios", "ai-agent"
  service_name: string;
  timestamp: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string;
  user_id: string;
  session_id: string;
  payload: string;
  ingested_at: string;
  sdk_version: string;
  runtime: string;
  ip_address: string;
  region: string;
}

// OverviewStats is the shape returned by the overview API route.
export interface OverviewStats {
  total_events: number;
  error_count: number;
  audit_count: number;
  log_count: number;
  trace_count: number;
  metric_count: number;
  unique_users: number;
  unique_apps: number;
}

// HourlyBucket is one data point for the events-over-time chart.
export interface HourlyBucket {
  hour: string;
  count: number;
  error_count: number;
}

// GeoCountBucket is one row from the geo distribution query.
// region holds the ISO 3166-1 alpha-2 country code written by the gateway
// after GeoIP resolution of the client IP address.
export interface GeoCountBucket {
  region: string;
  event_count: number;
  unique_users: number;
}

// queryOverviewStats returns aggregate counts for a time range for one org.
// from/to are ISO timestamp strings; when omitted the last 24 hours are used.
export async function queryOverviewStats(
  orgId: string,
  opts?: { from?: string; to?: string },
): Promise<OverviewStats> {
  const fromClause = opts?.from
    ? "AND timestamp >= {from: DateTime64(3)}"
    : "AND timestamp >= now() - INTERVAL 24 HOUR";
  const toClause = opts?.to ? "AND timestamp <= {to: DateTime64(3)}" : "";

  const result = await clickhouse.query({
    query: `
      SELECT
        count()                                          AS total_events,
        countIf(severity IN ('error','critical'))       AS error_count,
        countIf(event_type = 'audit')                   AS audit_count,
        countIf(event_type = 'log')                     AS log_count,
        countIf(event_type = 'trace')                   AS trace_count,
        countIf(event_type = 'metric')                  AS metric_count,
        uniqExact(user_id)                              AS unique_users,
        uniqExact(application_id)                       AS unique_apps
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        ${fromClause}
        ${toClause}
    `,
    query_params: {
      orgId,
      ...(opts?.from ? { from: opts.from } : {}),
      ...(opts?.to   ? { to:   opts.to   } : {}),
    },
    format: "JSONEachRow",
  });

  const rows = await result.json<OverviewStats>();
  return (
    rows[0] ?? {
      total_events: 0,
      error_count: 0,
      audit_count: 0,
      log_count: 0,
      trace_count: 0,
      metric_count: 0,
      unique_users: 0,
      unique_apps: 0,
    }
  );
}

// queryHourlyBuckets returns time-bucketed event counts for the trend chart.
// Auto-selects hourly buckets for ranges ≤ 48 h, daily for longer ranges so
// the chart stays readable regardless of the selected time window.
// from/to are ISO timestamp strings; when omitted the last 24 hours are used.
export async function queryHourlyBuckets(
  orgId: string,
  opts?: { from?: string; to?: string },
): Promise<HourlyBucket[]> {
  const fromClause = opts?.from
    ? "AND timestamp >= {from: DateTime64(3)}"
    : "AND timestamp >= now() - INTERVAL 24 HOUR";
  const toClause = opts?.to ? "AND timestamp <= {to: DateTime64(3)}" : "";

  // Choose bucket granularity based on range duration.
  const fromMs = opts?.from ? new Date(opts.from).getTime() : Date.now() - 86_400_000;
  const toMs   = opts?.to   ? new Date(opts.to).getTime()   : Date.now();
  const hours  = (toMs - fromMs) / 3_600_000;
  // Full ISO-compatible format so EventsTrendChart can parse with new Date().
  const bucketExpr = hours > 48
    ? "formatDateTime(toStartOfDay(timestamp),  '%Y-%m-%d')"
    : "formatDateTime(toStartOfHour(timestamp), '%Y-%m-%d %H:00:00')";

  const result = await clickhouse.query({
    query: `
      SELECT
        ${bucketExpr}                                     AS hour,
        count()                                           AS count,
        countIf(severity IN ('error','critical'))         AS error_count
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        ${fromClause}
        ${toClause}
      GROUP BY hour
      ORDER BY hour ASC
    `,
    query_params: {
      orgId,
      ...(opts?.from ? { from: opts.from } : {}),
      ...(opts?.to   ? { to:   opts.to   } : {}),
    },
    format: "JSONEachRow",
  });

  return result.json<HourlyBucket>();
}

// queryMonthlyUsage returns the total event count for the current calendar month.
export async function queryMonthlyUsage(orgId: string): Promise<number> {
  const result = await clickhouse.query({
    query: `
      SELECT count() AS total
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        AND toStartOfMonth(timestamp) = toStartOfMonth(now())
    `,
    query_params: { orgId },
    format: "JSONEachRow",
  });

  const rows = await result.json<{ total: number }>();
  return Number(rows[0]?.total ?? 0);
}

// queryTraceSpans returns all spans belonging to a single trace, ordered by
// timestamp ASC so the tree can compute relative time offsets from the root.
export async function queryTraceSpans(
  orgId: string,
  traceId: string,
): Promise<EventRow[]> {
  const result = await clickhouse.query({
    query: `
      SELECT *
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        AND trace_id = {traceId: String}
      ORDER BY timestamp ASC
    `,
    query_params: { orgId, traceId },
    format: "JSONEachRow",
  });
  return result.json<EventRow>();
}

// queryEvents is a generic paginated query used by all explorer pages.
// The `search` field supports KQL-lite syntax parsed by search-parser.ts:
//   plain text → message ILIKE '%term%'
//   severity:error service:api* → field conditions ANDed with message parts
export async function queryEvents(opts: {
  orgId: string;
  appId?: string;
  eventType?: string;
  severity?: string;
  source?: string;
  serviceName?: string;
  search?: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}): Promise<EventRow[]> {
  const {
    orgId,
    appId,
    eventType,
    severity,
    source,
    serviceName,
    search,
    limit = 50,
    offset = 0,
    from,
    to,
  } = opts;

  const conditions: string[] = [
    "organization_id = {orgId: String}",
  ];

  if (appId) conditions.push("application_id = {appId: String}");
  if (eventType) conditions.push("event_type = {eventType: String}");
  if (severity) conditions.push("severity = {severity: String}");
  if (source) conditions.push("source = {source: String}");
  if (serviceName) conditions.push("service_name ILIKE {serviceName: String}");
  if (from) conditions.push("timestamp >= {from: DateTime64(3)}");
  if (to) conditions.push("timestamp <= {to: DateTime64(3)}");

  // Parse the search string into typed field conditions + plain message ILIKE.
  const parsed = parseSearchQuery(search ?? "");
  conditions.push(...parsed.conditions);

  const result = await clickhouse.query({
    query: `
      SELECT *
      FROM watcher.events
      WHERE ${conditions.join(" AND ")}
      ORDER BY timestamp DESC
      LIMIT {limit: UInt32}
      OFFSET {offset: UInt32}
    `,
    query_params: {
      orgId,
      appId: appId ?? "",
      eventType: eventType ?? "",
      severity: severity ?? "",
      source: source ?? "",
      serviceName: serviceName ? `%${serviceName}%` : "",
      limit,
      offset,
      from: from ?? "",
      to: to ?? "",
      // Dynamic params from the search parser (sq0, sq1, …)
      ...parsed.params,
    },
    format: "JSONEachRow",
  });

  return result.json<EventRow>();
}

// queryGeoDistribution returns per-country event and unique-user counts.
// from/to are ISO timestamp strings; when omitted the last 24 hours are used.
export async function queryGeoDistribution(
  orgId: string,
  opts?: { from?: string; to?: string },
): Promise<GeoCountBucket[]> {
  const fromClause = opts?.from
    ? "AND timestamp >= {from: DateTime64(3)}"
    : "AND timestamp >= now() - INTERVAL 24 HOUR";
  const toClause = opts?.to ? "AND timestamp <= {to: DateTime64(3)}" : "";

  const result = await clickhouse.query({
    query: `
      SELECT
        region,
        count()            AS event_count,
        uniqExact(user_id) AS unique_users
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        ${fromClause}
        ${toClause}
        AND region != ''
        AND length(region) = 2
      GROUP BY region
      ORDER BY event_count DESC
    `,
    query_params: {
      orgId,
      ...(opts?.from ? { from: opts.from } : {}),
      ...(opts?.to   ? { to:   opts.to   } : {}),
    },
    format: "JSONEachRow",
  });

  return result.json<GeoCountBucket>();
}

// AIEventRow extends EventRow with parsed payload fields extracted server-side
// so the AI explorer columns don't need to JSON.parse in every cell renderer.
export interface AIEventRow extends EventRow {
  ai_kind: string;
  ai_model: string;
  ai_total_tokens: number;
  ai_cost_usd: number;
  ai_latency_ms: number;
}

// queryAIEvents is a paginated query for AI events with kind and model filters.
// The kind and model fields live inside the JSON payload column, so they are
// extracted server-side rather than filtering client-side.
export async function queryAIEvents(opts: {
  orgId: string;
  appId?: string;
  kind?: string;
  model?: string;
  severity?: string;
  search?: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}): Promise<AIEventRow[]> {
  const {
    orgId, appId, kind, model, severity, search,
    limit = 50, offset = 0, from, to,
  } = opts;

  const conditions: string[] = ["organization_id = {orgId: String}", "event_type = 'ai'"];

  if (appId)    conditions.push("application_id = {appId: String}");
  if (severity) conditions.push("severity = {severity: String}");
  if (kind)     conditions.push("JSONExtractString(payload, 'kind') = {kind: String}");
  if (model)    conditions.push("JSONExtractString(payload, 'model') = {model: String}");
  if (from)     conditions.push("timestamp >= {from: DateTime64(3)}");
  if (to)       conditions.push("timestamp <= {to: DateTime64(3)}");

  const parsed = parseSearchQuery(search ?? "");
  conditions.push(...parsed.conditions);

  const result = await clickhouse.query({
    query: `
      SELECT
        *,
        JSONExtractString(payload, 'kind')         AS ai_kind,
        JSONExtractString(payload, 'model')        AS ai_model,
        JSONExtractInt(payload, 'total_tokens')    AS ai_total_tokens,
        JSONExtractFloat(payload, 'cost_usd')      AS ai_cost_usd,
        JSONExtractFloat(payload, 'latency_ms')    AS ai_latency_ms
      FROM watcher.events
      WHERE ${conditions.join(" AND ")}
      ORDER BY timestamp DESC
      LIMIT {limit: UInt32}
      OFFSET {offset: UInt32}
    `,
    query_params: {
      orgId,
      appId: appId ?? "",
      severity: severity ?? "",
      kind: kind ?? "",
      model: model ?? "",
      limit,
      offset,
      from: from ?? "",
      to: to ?? "",
      ...parsed.params,
    },
    format: "JSONEachRow",
  });

  return result.json<AIEventRow>();
}

// AITokenBucket is one data point for the token-usage-over-time chart.
export interface AITokenBucket {
  bucket: string;
  model: string;
  total_tokens: number;
}

// AICostByModel is one row for the cost-by-model bar chart.
export interface AICostByModel {
  model: string;
  total_cost_usd: number;
  calls: number;
}

// AILatencyByModel is one row for the latency percentiles bar chart.
export interface AILatencyByModel {
  model: string;
  p50: number;
  p95: number;
  p99: number;
  calls: number;
}

// AIWorkflowCost is one row for the top-workflows-by-cost table.
export interface AIWorkflowCost {
  workflow_name: string;
  total_cost_usd: number;
  runs: number;
  p95_ms: number;
}

// queryAIStats runs one of four aggregation queries used by the AI dashboard widgets.
export async function queryAIStats(
  orgId: string,
  metric: "tokens-over-time" | "cost-by-model" | "latency-by-model" | "workflow-cost",
  opts?: { from?: string; to?: string },
): Promise<AITokenBucket[] | AICostByModel[] | AILatencyByModel[] | AIWorkflowCost[]> {
  const fromClause = opts?.from ? "AND timestamp >= {from: DateTime64(3)}" : "AND timestamp >= now() - INTERVAL 24 HOUR";
  const toClause   = opts?.to   ? "AND timestamp <= {to: DateTime64(3)}"   : "";
  const params     = { orgId, ...(opts?.from ? { from: opts.from } : {}), ...(opts?.to ? { to: opts.to } : {}) };

  if (metric === "tokens-over-time") {
    const r = await clickhouse.query({
      query: `
        SELECT
          formatDateTime(toStartOfHour(timestamp), '%Y-%m-%d %H:00:00') AS bucket,
          JSONExtractString(payload, 'model')                            AS model,
          SUM(JSONExtractInt(payload, 'total_tokens'))                   AS total_tokens
        FROM watcher.events
        WHERE organization_id = {orgId: String}
          AND event_type = 'ai'
          AND JSONExtractString(payload, 'kind') = 'llm_call'
          ${fromClause} ${toClause}
        GROUP BY bucket, model
        ORDER BY bucket ASC
      `,
      query_params: params,
      format: "JSONEachRow",
    });
    return r.json<AITokenBucket>();
  }

  if (metric === "cost-by-model") {
    const r = await clickhouse.query({
      query: `
        SELECT
          JSONExtractString(payload, 'model')        AS model,
          SUM(JSONExtractFloat(payload, 'cost_usd')) AS total_cost_usd,
          COUNT()                                    AS calls
        FROM watcher.events
        WHERE organization_id = {orgId: String}
          AND event_type = 'ai'
          AND JSONExtractString(payload, 'kind') = 'llm_call'
          ${fromClause} ${toClause}
        GROUP BY model
        ORDER BY total_cost_usd DESC
      `,
      query_params: params,
      format: "JSONEachRow",
    });
    return r.json<AICostByModel>();
  }

  if (metric === "latency-by-model") {
    const r = await clickhouse.query({
      query: `
        SELECT
          JSONExtractString(payload, 'model')                        AS model,
          quantile(0.50)(JSONExtractFloat(payload, 'latency_ms'))    AS p50,
          quantile(0.95)(JSONExtractFloat(payload, 'latency_ms'))    AS p95,
          quantile(0.99)(JSONExtractFloat(payload, 'latency_ms'))    AS p99,
          COUNT()                                                    AS calls
        FROM watcher.events
        WHERE organization_id = {orgId: String}
          AND event_type = 'ai'
          AND JSONExtractString(payload, 'kind') = 'llm_call'
          ${fromClause} ${toClause}
        GROUP BY model
        ORDER BY p95 DESC
      `,
      query_params: params,
      format: "JSONEachRow",
    });
    return r.json<AILatencyByModel>();
  }

  // workflow-cost
  const r = await clickhouse.query({
    query: `
      SELECT
        JSONExtractString(payload, 'workflow_name')                 AS workflow_name,
        SUM(JSONExtractFloat(payload, 'total_cost_usd'))            AS total_cost_usd,
        COUNT()                                                     AS runs,
        quantile(0.95)(JSONExtractFloat(payload, 'duration_ms'))    AS p95_ms
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        AND event_type = 'ai'
        AND JSONExtractString(payload, 'kind') = 'workflow_end'
        ${fromClause} ${toClause}
      GROUP BY workflow_name
      ORDER BY total_cost_usd DESC
      LIMIT 10
    `,
    query_params: params,
    format: "JSONEachRow",
  });
  return r.json<AIWorkflowCost>();
}

// getMonthlyEventCount returns the number of events ingested by an org in the
// current calendar month. Used by the billing usage meter.
export async function getMonthlyEventCount(orgId: string): Promise<number> {
  const result = await clickhouse.query({
    query: `
      SELECT COUNT(*) AS count
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        AND toStartOfMonth(timestamp) = toStartOfMonth(now())
    `,
    query_params: { orgId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ count: string }>();
  return parseInt(rows[0]?.count ?? "0", 10);
}
