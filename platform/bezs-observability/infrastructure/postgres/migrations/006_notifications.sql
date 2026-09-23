-- 006_notifications.sql
-- Notification delivery infrastructure tables for the watcher24 database.
-- Owned by notifier-go (not the IAM Prisma schema).
-- Apply with: just migrate-pg

CREATE TABLE IF NOT EXISTS notification_channels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    channel     TEXT NOT NULL,          -- 'email' | 'slack' | 'webhook' | 'pagerduty'
    config      JSONB NOT NULL,         -- channel-specific config (email address, webhook url, etc.)
    enabled     BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (org_id, channel)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT NOT NULL,
    template        TEXT NOT NULL,
    channel         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
    attempts        INT DEFAULT 0,
    last_error      TEXT,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS in_app_notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    user_id     TEXT,                   -- NULL means org-wide notification
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    severity    TEXT DEFAULT 'info',    -- 'info' | 'warn' | 'error'
    read        BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_org   ON notification_channels (org_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_org ON notification_deliveries (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_org    ON in_app_notifications (org_id, read, created_at DESC);
