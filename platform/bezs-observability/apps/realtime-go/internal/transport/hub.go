// Package transport contains the WebSocket server infrastructure.
// The hub manages per-org connection sets and drives Redis fan-out.
package transport

import (
	"context"
	"sync"

	"github.com/gofiber/websocket/v2"

	"watcher24/realtime/internal/ports"
)

// conn wraps a WebSocket connection with a buffered send channel.
// Writing to the WebSocket is done exclusively by the per-connection write pump
// so we never write from multiple goroutines simultaneously.
type conn struct {
	ws   *websocket.Conn
	send chan []byte
}

// Send returns the receive-only channel the write pump should read from.
func (c *conn) Send() <-chan []byte {
	return c.send
}

// Hub manages WebSocket connections grouped by org ID and drives the
// per-org Redis pub/sub fan-out. One Redis subscription is maintained per
// active org — it starts when the first connection for that org arrives and
// is cancelled when the last connection leaves.
type Hub struct {
	mu         sync.RWMutex
	conns      map[string]map[*conn]struct{} // orgID → set of connections
	cancels    map[string]context.CancelFunc // orgID → cancel for its subscription goroutine
	subscriber ports.EventSubscriber
}

// NewHub constructs a Hub with the given Redis subscriber.
func NewHub(subscriber ports.EventSubscriber) *Hub {
	return &Hub{
		conns:      make(map[string]map[*conn]struct{}),
		cancels:    make(map[string]context.CancelFunc),
		subscriber: subscriber,
	}
}

// Register adds a WebSocket connection to the hub for the given org.
// If this is the first connection for the org, a Redis subscription is started.
// Returns the conn so the caller can run its write pump.
func (h *Hub) Register(orgID string, ws *websocket.Conn) *conn {
	c := &conn{ws: ws, send: make(chan []byte, 256)}

	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.conns[orgID]; !exists {
		h.conns[orgID] = make(map[*conn]struct{})
		h.startSubscription(orgID) // starts goroutine, must hold write lock
	}
	h.conns[orgID][c] = struct{}{}

	return c
}

// Unregister removes a connection from the hub.
// If it was the last connection for the org, the Redis subscription is cancelled.
func (h *Hub) Unregister(orgID string, c *conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	set, ok := h.conns[orgID]
	if !ok {
		return
	}

	close(c.send)
	delete(set, c)

	if len(set) == 0 {
		delete(h.conns, orgID)
		if cancel, ok := h.cancels[orgID]; ok {
			cancel()
			delete(h.cancels, orgID)
		}
	}
}

// startSubscription launches a goroutine that reads from Redis pub/sub and
// fans events out to all connections for orgID. Must be called with the write lock held.
func (h *Hub) startSubscription(orgID string) {
	ctx, cancel := context.WithCancel(context.Background())
	h.cancels[orgID] = cancel

	go func() {
		eventCh, err := h.subscriber.Subscribe(ctx, orgID)
		if err != nil {
			cancel()
			return
		}

		for raw := range eventCh {
			h.broadcast(orgID, raw)
		}
	}()
}

// broadcast sends raw event bytes to every connection for the given org.
// Non-blocking: slow connections drop the event rather than stalling others.
func (h *Hub) broadcast(orgID string, raw []byte) {
	h.mu.RLock()
	set := h.conns[orgID]
	h.mu.RUnlock()

	for c := range set {
		select {
		case c.send <- raw:
		default:
			// Slow consumer — drop rather than block the fan-out loop.
		}
	}
}
