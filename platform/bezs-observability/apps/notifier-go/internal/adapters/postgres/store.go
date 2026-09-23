// Package postgres implements the DeliveryStore, InAppStore, and ChannelConfigStore
// ports using pgx against the watcher24 PostgreSQL database.
//
// Three separate adapter structs share one connection pool.
// Go does not allow the same method name twice on a struct, so each port
// gets its own type (DeliveryStoreAdapter, InAppStoreAdapter, ChannelConfigStoreAdapter).
// All three are constructed via NewPool so the pool is created once.
package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"watcher24/notifier/internal/domain"
	"watcher24/notifier/internal/ports"
)

// Pool wraps the shared pgx connection pool.
// Callers use it to construct the individual store adapters.
type Pool struct {
	p *pgxpool.Pool
}

// NewPool creates and verifies the PostgreSQL connection pool.
// Call Close() on the returned Pool during graceful shutdown.
func NewPool(ctx context.Context, databaseURL string) (*Pool, error) {
	p, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("notifier postgres: create pool: %w", err)
	}
	if err := p.Ping(ctx); err != nil {
		return nil, fmt.Errorf("notifier postgres: ping: %w", err)
	}
	return &Pool{p: p}, nil
}

// Ping checks DB connectivity. Used by the health handler.
func (pl *Pool) Ping(ctx context.Context) error {
	return pl.p.Ping(ctx)
}

// Close releases all pool connections.
func (pl *Pool) Close() {
	pl.p.Close()
}

// DeliveryStore implements ports.DeliveryStore via PostgreSQL.
func (pl *Pool) DeliveryStore() *DeliveryStoreAdapter {
	return &DeliveryStoreAdapter{pool: pl.p}
}

// InAppStore implements ports.InAppStore via PostgreSQL.
func (pl *Pool) InAppStore() *InAppStoreAdapter {
	return &InAppStoreAdapter{pool: pl.p}
}

// ChannelConfigStore implements ports.ChannelConfigStore via PostgreSQL.
func (pl *Pool) ChannelConfigStore() *ChannelConfigStoreAdapter {
	return &ChannelConfigStoreAdapter{pool: pl.p}
}

// ── DeliveryStoreAdapter ─────────────────────────────────────────────────────

// DeliveryStoreAdapter implements ports.DeliveryStore, writing to notification_deliveries.
type DeliveryStoreAdapter struct {
	pool *pgxpool.Pool
}

// CreateDelivery inserts a pending delivery record and returns its generated UUID.
func (a *DeliveryStoreAdapter) Create(ctx context.Context, orgID, templateName string, channel domain.Channel) (string, error) {
	var id string
	err := a.pool.QueryRow(ctx,
		`INSERT INTO notification_deliveries (org_id, template, channel, status, attempts)
		 VALUES ($1, $2, $3, 'pending', 0)
		 RETURNING id`,
		orgID, templateName, string(channel),
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("delivery create: %w", err)
	}
	return id, nil
}

// MarkSent sets status=sent and records the delivery timestamp.
func (a *DeliveryStoreAdapter) MarkSent(ctx context.Context, id string) error {
	now := time.Now().UTC()
	_, err := a.pool.Exec(ctx,
		`UPDATE notification_deliveries
		 SET status='sent', delivered_at=$1, attempts=attempts+1
		 WHERE id=$2`,
		now, id,
	)
	return err
}

// MarkFailed records a delivery failure and increments the attempts counter.
func (a *DeliveryStoreAdapter) MarkFailed(ctx context.Context, id, errMsg string) error {
	_, err := a.pool.Exec(ctx,
		`UPDATE notification_deliveries
		 SET status='failed', last_error=$1, attempts=attempts+1
		 WHERE id=$2`,
		errMsg, id,
	)
	return err
}

// ListByOrg returns the most recent deliveries for an org.
func (a *DeliveryStoreAdapter) ListByOrg(ctx context.Context, orgID string, limit int) ([]*domain.Delivery, error) {
	rows, err := a.pool.Query(ctx,
		`SELECT id, org_id, template, channel, status, attempts, COALESCE(last_error,''), delivered_at, created_at
		 FROM notification_deliveries
		 WHERE org_id=$1
		 ORDER BY created_at DESC
		 LIMIT $2`,
		orgID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("delivery list: %w", err)
	}
	defer rows.Close()

	var out []*domain.Delivery
	for rows.Next() {
		d := &domain.Delivery{}
		var ch string
		var status string
		if err := rows.Scan(&d.ID, &d.OrgID, &d.Template, &ch, &status, &d.Attempts, &d.LastError, &d.DeliveredAt, &d.CreatedAt); err != nil {
			return nil, fmt.Errorf("delivery scan: %w", err)
		}
		d.Channel = domain.Channel(ch)
		d.Status = domain.DeliveryStatus(status)
		out = append(out, d)
	}
	return out, rows.Err()
}

// ── InAppStoreAdapter ─────────────────────────────────────────────────────────

// InAppStoreAdapter implements ports.InAppStore, writing to in_app_notifications.
type InAppStoreAdapter struct {
	pool *pgxpool.Pool
}

// CreateNotification inserts a new in-app notification row.
func (a *InAppStoreAdapter) Create(ctx context.Context, n *domain.InAppNotification) error {
	_, err := a.pool.Exec(ctx,
		`INSERT INTO in_app_notifications (org_id, user_id, title, body, severity)
		 VALUES ($1, NULLIF($2,''), $3, $4, $5)`,
		n.OrgID, n.UserID, n.Title, n.Body, n.Severity,
	)
	return err
}

// ListByOrg returns the most recent notifications for an org.
func (a *InAppStoreAdapter) ListByOrg(ctx context.Context, orgID string, limit int) ([]*domain.InAppNotification, error) {
	rows, err := a.pool.Query(ctx,
		`SELECT id, org_id, COALESCE(user_id,''), title, body, severity, read, created_at
		 FROM in_app_notifications
		 WHERE org_id=$1
		 ORDER BY created_at DESC
		 LIMIT $2`,
		orgID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("in-app list: %w", err)
	}
	defer rows.Close()

	var out []*domain.InAppNotification
	for rows.Next() {
		n := &domain.InAppNotification{}
		if err := rows.Scan(&n.ID, &n.OrgID, &n.UserID, &n.Title, &n.Body, &n.Severity, &n.Read, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("in-app scan: %w", err)
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

// MarkRead marks a single notification as read, scoped by orgID to prevent cross-org access.
func (a *InAppStoreAdapter) MarkRead(ctx context.Context, id, orgID string) error {
	_, err := a.pool.Exec(ctx,
		`UPDATE in_app_notifications SET read=true WHERE id=$1 AND org_id=$2`,
		id, orgID,
	)
	return err
}

// MarkAllRead marks every notification for the org as read.
func (a *InAppStoreAdapter) MarkAllRead(ctx context.Context, orgID string) error {
	_, err := a.pool.Exec(ctx,
		`UPDATE in_app_notifications SET read=true WHERE org_id=$1 AND read=false`,
		orgID,
	)
	return err
}

// UnreadCount returns the count of unread notifications for an org.
func (a *InAppStoreAdapter) UnreadCount(ctx context.Context, orgID string) (int, error) {
	var count int
	err := a.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM in_app_notifications WHERE org_id=$1 AND read=false`,
		orgID,
	).Scan(&count)
	return count, err
}

// ── ChannelConfigStoreAdapter ─────────────────────────────────────────────────

// ChannelConfigStoreAdapter implements ports.ChannelConfigStore, reading and
// writing notification_channels rows.
type ChannelConfigStoreAdapter struct {
	pool *pgxpool.Pool
}

// GetConfig returns the JSONB config for an org + channel, or nil if not configured.
func (a *ChannelConfigStoreAdapter) GetConfig(ctx context.Context, orgID string, channel domain.Channel) (map[string]any, error) {
	var raw []byte
	err := a.pool.QueryRow(ctx,
		`SELECT config FROM notification_channels WHERE org_id=$1 AND channel=$2 AND enabled=true`,
		orgID, string(channel),
	).Scan(&raw)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("channel config get: %w", err)
	}
	var cfg map[string]any
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return nil, fmt.Errorf("channel config unmarshal: %w", err)
	}
	return cfg, nil
}

// Upsert inserts or updates the channel config for an org.
func (a *ChannelConfigStoreAdapter) Upsert(ctx context.Context, orgID string, channel domain.Channel, config map[string]any, enabled bool) error {
	raw, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("channel config marshal: %w", err)
	}
	_, err = a.pool.Exec(ctx,
		`INSERT INTO notification_channels (org_id, channel, config, enabled)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (org_id, channel) DO UPDATE SET config=$3, enabled=$4`,
		orgID, string(channel), raw, enabled,
	)
	return err
}

// List returns all channel configs for an org.
func (a *ChannelConfigStoreAdapter) List(ctx context.Context, orgID string) ([]*ports.ChannelConfig, error) {
	rows, err := a.pool.Query(ctx,
		`SELECT id, org_id, channel, config, enabled FROM notification_channels WHERE org_id=$1`,
		orgID,
	)
	if err != nil {
		return nil, fmt.Errorf("channel config list: %w", err)
	}
	defer rows.Close()

	var out []*ports.ChannelConfig
	for rows.Next() {
		cc := &ports.ChannelConfig{}
		var ch string
		var raw []byte
		if err := rows.Scan(&cc.ID, &cc.OrgID, &ch, &raw, &cc.Enabled); err != nil {
			return nil, fmt.Errorf("channel config scan: %w", err)
		}
		cc.Channel = domain.Channel(ch)
		if err := json.Unmarshal(raw, &cc.Config); err != nil {
			return nil, fmt.Errorf("channel config unmarshal: %w", err)
		}
		out = append(out, cc)
	}
	return out, rows.Err()
}
