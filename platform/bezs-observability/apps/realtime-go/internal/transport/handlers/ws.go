// Package handlers contains the HTTP and WebSocket request handlers.
// Handlers are thin — they extract inputs, call use cases, and return responses.
// No business logic lives here.
package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

	"watcher24/realtime/internal/transport"
	"watcher24/realtime/internal/usecases"
)

// WSHandler handles the WebSocket upgrade and drives the connection lifecycle.
type WSHandler struct {
	auth *usecases.AuthenticateConnectionUseCase
	hub  *transport.Hub
}

// NewWSHandler constructs the handler with its dependencies.
func NewWSHandler(auth *usecases.AuthenticateConnectionUseCase, hub *transport.Hub) *WSHandler {
	return &WSHandler{auth: auth, hub: hub}
}

// Upgrade is the HTTP middleware that authenticates and upgrades the connection.
// Must run before the websocket.New handler in the route chain.
func (h *WSHandler) Upgrade(c *fiber.Ctx) error {
	if !websocket.IsWebSocketUpgrade(c) {
		return fiber.ErrUpgradeRequired
	}

	rawKey := extractKey(c)
	orgID, err := h.auth.Execute(c.Context(), rawKey)
	if err != nil {
		return fiber.ErrUnauthorized
	}

	// Store the resolved org ID so the WebSocket handler can read it.
	c.Locals("org_id", orgID)
	return c.Next()
}

// Handle is the WebSocket handler — runs after the HTTP upgrade.
// Registers the connection with the hub, runs the write pump in a goroutine,
// and blocks on the read pump to detect client disconnects.
func (h *WSHandler) Handle(c *websocket.Conn) {
	orgID, _ := c.Locals("org_id").(string)
	conn := h.hub.Register(orgID, c)
	defer h.hub.Unregister(orgID, conn)

	// Write pump — forward hub events to the WebSocket client.
	go func() {
		for raw := range conn.Send() {
			if err := c.WriteMessage(websocket.TextMessage, raw); err != nil {
				return
			}
		}
	}()

	// Read pump — blocks until the client closes the connection.
	// We don't process client messages (this is a push-only stream)
	// but we need to read to surface close/error frames.
	for {
		if _, _, err := c.ReadMessage(); err != nil {
			return
		}
	}
}

// extractKey reads the API key from the Authorization header or ?token query param.
func extractKey(c *fiber.Ctx) string {
	if auth := c.Get("Authorization"); auth != "" {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return c.Query("token")
}
