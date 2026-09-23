// store.go defines the persistence ports for notification data.
// The use cases depend on these interfaces, never on pgx or any concrete DB client.
package ports

import (
	"context"

	"watcher24/notifier/internal/domain"
)

// DeliveryStore is the port for recording notification delivery attempts.
// The PostgreSQL adapter implements this, writing to notification_deliveries.
type DeliveryStore interface {
	// Create inserts a new pending delivery record and returns its generated ID.
	Create(ctx context.Context, orgID, templateName string, channel domain.Channel) (string, error)

	// MarkSent marks a delivery as successfully sent.
	MarkSent(ctx context.Context, id string) error

	// MarkFailed records a delivery failure with the error message.
	// The attempts counter is incremented by the store.
	MarkFailed(ctx context.Context, id, errMsg string) error

	// ListByOrg returns the last N deliveries for an org, newest first.
	ListByOrg(ctx context.Context, orgID string, limit int) ([]*domain.Delivery, error)
}

// InAppStore is the port for writing and reading in-app notifications.
// Backed by the in_app_notifications PostgreSQL table.
type InAppStore interface {
	// Create inserts a new in-app notification row.
	Create(ctx context.Context, n *domain.InAppNotification) error

	// ListByOrg returns unread + recent notifications for an org, newest first.
	ListByOrg(ctx context.Context, orgID string, limit int) ([]*domain.InAppNotification, error)

	// MarkRead marks a single notification as read.
	MarkRead(ctx context.Context, id, orgID string) error

	// MarkAllRead marks all notifications for an org as read.
	MarkAllRead(ctx context.Context, orgID string) error

	// UnreadCount returns the number of unread notifications for an org.
	UnreadCount(ctx context.Context, orgID string) (int, error)
}

// ChannelConfigStore is the port for reading per-org channel configuration.
// The use case uses this to look up the email address / webhook URL when
// delivering to a channel — it never hardcodes channel config.
type ChannelConfigStore interface {
	// GetConfig returns the JSONB config for the given org + channel combination.
	// Returns nil, nil when no config row exists (channel not configured).
	GetConfig(ctx context.Context, orgID string, channel domain.Channel) (map[string]any, error)

	// Upsert saves or updates the config for an org + channel.
	Upsert(ctx context.Context, orgID string, channel domain.Channel, config map[string]any, enabled bool) error

	// List returns all configured channels for an org.
	List(ctx context.Context, orgID string) ([]*ChannelConfig, error)
}

// ChannelConfig is a flat representation of a notification_channels row,
// returned by ChannelConfigStore.List.
type ChannelConfig struct {
	ID      string
	OrgID   string
	Channel domain.Channel
	Config  map[string]any
	Enabled bool
}

// DedupStore is the port for deduplication key storage.
// Redis-backed with TTL — prevents alert storms from delivering duplicate
// notifications within the cooldown window.
type DedupStore interface {
	// IsDuplicate returns true if the dedup key was seen within the TTL window.
	IsDuplicate(ctx context.Context, dedupKey string) (bool, error)

	// SetSeen records a dedup key with the given TTL in seconds.
	SetSeen(ctx context.Context, dedupKey string, ttlSeconds int) error
}
