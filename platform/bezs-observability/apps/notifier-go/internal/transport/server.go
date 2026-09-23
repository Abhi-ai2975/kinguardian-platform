// Package transport builds the Fiber HTTP server for the notifier service.
// All routes are protected by the X-Internal-Secret middleware — there are
// no public endpoints beyond /health.
package transport

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"watcher24/notifier/internal/transport/handlers"
)

// NewServer builds the Fiber app with all routes registered.
// internalSecret is the value callers must send in X-Internal-Secret.
func NewServer(
	internalSecret string,
	notifyHandler *handlers.NotifyHandler,
	inAppHandler *handlers.InAppHandler,
	streamHandler *handlers.StreamHandler,
) *fiber.App {
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "internal server error",
				"code":  "INTERNAL_ERROR",
			})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${method} ${path} ${latency}\n",
	}))

	// Public health check — no auth required.
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	// Internal API — all routes require the shared secret header.
	internal := app.Group("/api/internal", authMiddleware(internalSecret))
	internal.Post("/notify", notifyHandler.Handle)
	internal.Get("/notifications", inAppHandler.HandleList)
	internal.Patch("/notifications/:id/read", inAppHandler.HandleMarkRead)
	internal.Patch("/notifications/read-all", inAppHandler.HandleMarkAllRead)
	// SSE endpoint — streams real-time notification signals to the console.
	internal.Get("/notifications/events", streamHandler.HandleStream)

	return app
}

// authMiddleware rejects requests that do not carry the correct X-Internal-Secret header.
// This protects internal endpoints from being called by external callers.
func authMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Get("X-Internal-Secret") != secret {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "unauthorized",
				"code":  "UNAUTHORIZED",
			})
		}
		return c.Next()
	}
}
