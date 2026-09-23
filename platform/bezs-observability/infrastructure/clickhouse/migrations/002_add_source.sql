-- Add source column to watcher.events to distinguish client vs server events.
--
-- "client" = submitted via a public token (wpub_) — browser, mobile, or desktop SDK.
-- "server" = submitted via a secret API key (wt_) — @watcher/node, Python, or Go SDK.
--
-- LowCardinality keeps storage and query costs near zero for this two-value field.
-- DEFAULT '' preserves backwards compatibility for events ingested before this migration.
ALTER TABLE watcher.events
    ADD COLUMN IF NOT EXISTS source LowCardinality(String) DEFAULT '';
