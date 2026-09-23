// Package transport wires together the Fiber HTTP server, middleware, and handlers.
// This is the outermost layer of the clean architecture — it knows about HTTP
// but delegates all business logic to use cases via handlers.
package transport

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"watcher24/gateway/internal/transport/handlers"
	"watcher24/gateway/internal/transport/middleware"
	"watcher24/gateway/internal/ports"
)

// Server wraps the Fiber app and exposes a clean Start() method.
type Server struct {
	app *fiber.App
}

// NewServer builds the Fiber application, registers all middleware and routes,
// and returns the server ready to listen. Nothing starts listening until
// Start() is called.
func NewServer(
	validator ports.KeyValidator,
	eventsHandler *handlers.EventsHandler,
	healthHandler *handlers.HealthHandler,
) *Server {
	app := fiber.New(fiber.Config{
		// Disable the default error handler so our handlers control the response format.
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "internal server error",
				"code":  "INTERNAL_ERROR",
			})
		},
	})

	// Global middleware — applied to every request
	app.Use(recover.New()) // recover from panics, return 500 instead of crashing
	// CORS must run before auth so browser preflight OPTIONS requests are
	// answered without needing an API key (preflights never carry credentials).
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool { return true }, // any origin allowed; key-based auth is the gate
		AllowMethods:     "GET,POST,OPTIONS",
		AllowHeaders:     "Authorization,Content-Type,X-API-Key,X-App-Id,X-Environment,X-SDK-Version,X-Service-Name,X-Runtime,X-Trace-Id",
		MaxAge:           86400, // cache preflight for 24 h
	}))
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${method} ${path} ${latency}\n",
	}))

	// Public routes — no authentication required
	app.Get("/health", healthHandler.Handle)

	// Authenticated ingestion routes — all protected by API key middleware
	v1 := app.Group("/v1", middleware.Auth(validator))
	v1.Post("/events", eventsHandler.HandleEvents)
	v1.Post("/logs", eventsHandler.HandleLogs)
	v1.Post("/traces", eventsHandler.HandleTraces)
	v1.Post("/metrics", eventsHandler.HandleMetrics)
	v1.Post("/audit", eventsHandler.HandleAudit)

	return &Server{app: app}
}

// Start begins listening on the given address (e.g. ":8080").
// Blocks until the server shuts down or an error occurs.
func (s *Server) Start(addr string) error {
	return s.app.Listen(addr)
}

// Shutdown gracefully stops the server without interrupting active connections.
func (s *Server) Shutdown() error {
	return s.app.Shutdown()
}
