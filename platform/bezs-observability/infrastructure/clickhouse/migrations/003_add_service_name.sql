-- Add service_name column to watcher.events.
--
-- service_name is an optional developer-set label that identifies what kind of
-- service or component sent the event. It is set at SDK initialisation time and
-- flows through as the X-Service-Name header.
--
-- Examples: "payment-api", "auth-worker", "mobile-ios", "desktop-app", "ai-agent"
--
-- Unlike source (automatic, gateway-derived), service_name is developer-controlled
-- and can be any string — it is meant for filtering and dashboard organisation.
--
-- LowCardinality is appropriate because most orgs will have fewer than ~100 distinct
-- service names, keeping storage and query costs minimal.
-- DEFAULT '' preserves backwards compatibility for events ingested before this migration.
ALTER TABLE watcher.events
    ADD COLUMN IF NOT EXISTS service_name LowCardinality(String) DEFAULT '';
