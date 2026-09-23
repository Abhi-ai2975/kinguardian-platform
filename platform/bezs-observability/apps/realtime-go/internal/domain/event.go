// Package domain contains the pure data types for the realtime service.
// No external dependencies — only standard library types.
package domain

// OrgEvent is an event received from Redis pub/sub, ready to fan out.
// RawJSON is forwarded as-is to WebSocket clients — no re-serialization needed.
type OrgEvent struct {
	OrgID   string
	RawJSON []byte
}
