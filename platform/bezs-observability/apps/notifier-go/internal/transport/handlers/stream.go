// stream.go handles the SSE endpoint that pushes real-time notification signals
// to connected console clients.
//
// When the use case writes an in-app notification it publishes a lightweight
// Redis pub/sub signal. This handler subscribes to that channel and streams
// each signal as an SSE event so the browser can invalidate its notification
// cache without waiting for the 30-second poll interval.
package handlers

import (
	"bufio"
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"

	"watcher24/notifier/internal/ports"
)

// StreamHandler handles the SSE stream for real-time notification signals.
type StreamHandler struct {
	pubsub ports.NotificationPubSub
}

// NewStreamHandler wires the handler with a NotificationPubSub port.
func NewStreamHandler(pubsub ports.NotificationPubSub) *StreamHandler {
	return &StreamHandler{pubsub: pubsub}
}

// HandleStream opens a Server-Sent Events stream for the given org_id.
// Each time an in-app notification is written for that org a "notification"
// event is pushed so the browser knows to refetch.
// A heartbeat comment is sent every 25 seconds to keep proxies from closing
// the idle connection.
func (h *StreamHandler) HandleStream(c *fiber.Ctx) error {
	orgID := c.Query("org_id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "org_id is required",
			"code":  "MISSING_ORG_ID",
		})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	// Prevents nginx/Caddy from buffering the SSE stream.
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		// Create a cancellable context so the Redis subscriber is cleaned up
		// when the write pump exits (i.e. when the client disconnects).
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		ch, err := h.pubsub.Subscribe(ctx, orgID)
		if err != nil {
			fmt.Fprintf(w, "event: error\ndata: subscribe failed\n\n") //nolint:errcheck
			w.Flush()                                                    //nolint:errcheck
			return
		}

		// Heartbeat prevents nginx/proxies from closing idle SSE connections.
		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case _, ok := <-ch:
				if !ok {
					return
				}
				if _, err := fmt.Fprintf(w, "data: {\"type\":\"notification\"}\n\n"); err != nil {
					return // client disconnected
				}
				if err := w.Flush(); err != nil {
					return
				}

			case <-ticker.C:
				// SSE comment lines are ignored by the browser but keep the TCP
				// connection alive through proxies that close idle connections.
				if _, err := fmt.Fprintf(w, ": heartbeat\n\n"); err != nil {
					return
				}
				if err := w.Flush(); err != nil {
					return
				}
			}
		}
	})

	return nil
}
