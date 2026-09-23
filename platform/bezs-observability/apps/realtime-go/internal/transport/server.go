// Package transport builds the Fiber HTTP server and registers all routes.
// No business logic lives here — only routing and middleware configuration.
package transport

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
)

// RouteHandlers groups the handler funcs needed to register routes.
// Using plain functions rather than the handlers package types breaks the
// otherwise circular import between transport ↔ transport/handlers.
type RouteHandlers struct {
	WSUpgrade    fiber.Handler
	WSHandle     func(*websocket.Conn)
	HealthHandle fiber.Handler
}

// NewServer constructs the Fiber app with all routes registered.
func NewServer(h RouteHandlers) *fiber.App {
	app := fiber.New(fiber.Config{
		// Disable the default startup banner — cleaner container logs.
		DisableStartupMessage: true,
	})

	app.Use(recover.New())
	app.Use(logger.New())

	// Public health check — no auth required.
	app.Get("/health", h.HealthHandle)

	// WebSocket endpoint.
	// Upgrade middleware runs first (auth + HTTP→WS upgrade),
	// then the WebSocket handler takes over.
	app.Get("/ws", h.WSUpgrade, websocket.New(h.WSHandle))

	return app
}
