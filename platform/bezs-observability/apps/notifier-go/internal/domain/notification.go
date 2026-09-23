// Package domain contains the core value objects for the notifier service.
// No external imports — only standard library types. This layer has zero
// knowledge of Redis, PostgreSQL, SMTP, or HTTP.
package domain

import "time"

// Channel identifies a notification delivery channel.
type Channel string

const (
	ChannelEmail    Channel = "email"
	ChannelInApp    Channel = "in_app"
	ChannelSlack    Channel = "slack"
	ChannelWebhook  Channel = "webhook"
	ChannelPagerDuty Channel = "pagerduty"
)

// NotificationRequest is the parsed, validated payload that arrives from either
// the stream:notify consumer or the HTTP trigger endpoint.
// It represents intent to deliver — not yet a delivery attempt.
type NotificationRequest struct {
	OrgID    string
	UserID   string    // optional; empty means org-wide
	Template string    // e.g. "welcome_email", "alert_notification"
	Channels []Channel // which channels to deliver to
	Data     map[string]any // template variables
	DedupKey string         // set for alert-sourced requests; empty for transactional
}

// Delivery records one delivery attempt for one channel.
// Stored in notification_deliveries so orgs can see what was sent and why it failed.
type Delivery struct {
	ID          string         `json:"id"`
	OrgID       string         `json:"org_id"`
	Template    string         `json:"template"`
	Channel     Channel        `json:"channel"`
	Status      DeliveryStatus `json:"status"`
	Attempts    int            `json:"attempts"`
	LastError   string         `json:"last_error,omitempty"`
	DeliveredAt *time.Time     `json:"delivered_at,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
}

// DeliveryStatus represents the lifecycle state of a single delivery attempt.
type DeliveryStatus string

const (
	DeliveryPending DeliveryStatus = "pending"
	DeliverySent    DeliveryStatus = "sent"
	DeliveryFailed  DeliveryStatus = "failed"
)

// InAppNotification is a notification row written to PostgreSQL and shown
// in the console's notification bell dropdown.
type InAppNotification struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Severity  string    `json:"severity"` // "info" | "warn" | "error"
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"created_at"`
}

// RenderedMessage is the result of rendering a template with data.
// The EmailSender uses Subject + Body; InAppWriter uses Title + Body.
type RenderedMessage struct {
	Subject string // used by email
	Title   string // used by in-app
	Body    string // plain-text or HTML body
}
