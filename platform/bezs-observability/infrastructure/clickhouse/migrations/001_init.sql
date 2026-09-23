-- Core telemetry events table
-- All event types (logs, audit, traces, metrics, security, frontend, ai) land here
CREATE TABLE IF NOT EXISTS watcher.events
(
    -- Routing
    organization_id  String,
    application_id   String,
    environment      LowCardinality(String),   -- production | staging | development

    -- Classification
    event_type       LowCardinality(String),   -- audit | log | metric | trace | security | frontend | ai | system
    severity         LowCardinality(String),   -- debug | info | warn | error | critical

    -- Content
    message          String,
    timestamp        DateTime64(3, 'UTC'),     -- millisecond precision

    -- Tracing
    trace_id         String,
    span_id          String,
    parent_span_id   String,

    -- Actor
    user_id          String,
    session_id       String,

    -- Raw payload (arbitrary JSON per event type)
    payload          String,                   -- stored as JSON string

    -- Gateway metadata (added at ingestion time)
    ingested_at      DateTime64(3, 'UTC') DEFAULT now64(),
    sdk_version      String,
    runtime          String,
    ip_address       String,
    region           String
)
ENGINE = MergeTree()
PARTITION BY (toYYYYMM(timestamp), organization_id)
ORDER BY (organization_id, event_type, timestamp)
TTL toDateTime(timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;


-- Materialized view: fast audit event lookups per org + user
CREATE TABLE IF NOT EXISTS watcher.audit_events_mv_data
(
    organization_id  String,
    application_id   String,
    environment      LowCardinality(String),
    user_id          String,
    message          String,
    severity         LowCardinality(String),
    payload          String,
    timestamp        DateTime64(3, 'UTC'),
    trace_id         String
)
ENGINE = MergeTree()
ORDER BY (organization_id, user_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS watcher.audit_events_mv
TO watcher.audit_events_mv_data
AS
SELECT
    organization_id,
    application_id,
    environment,
    user_id,
    message,
    severity,
    payload,
    timestamp,
    trace_id
FROM watcher.events
WHERE event_type = 'audit';
