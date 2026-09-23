// Package handlers — health check handler.
// Reports Redis and IAM database connectivity so orchestrators can determine
// whether this instance is ready to serve traffic.
package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Pinger is satisfied by any adapter that exposes a Ping method.
type Pinger interface {
	Ping(ctx context.Context) error
}

// HealthHandler checks all downstream dependencies and returns a summary.
type HealthHandler struct {
	redis Pinger
	db    Pinger
}

// NewHealthHandler constructs the handler with the Redis and DB pingers.
func NewHealthHandler(redis, db Pinger) *HealthHandler {
	return &HealthHandler{redis: redis, db: db}
}

// Handle responds with 200 if all deps are healthy, 503 if any are degraded.
func (h *HealthHandler) Handle(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
	defer cancel()

	status := fiber.Map{"status": "ok"}
	code := fiber.StatusOK

	if err := h.redis.Ping(ctx); err != nil {
		status["redis"] = "error: " + err.Error()
		status["status"] = "degraded"
		code = fiber.StatusServiceUnavailable
	} else {
		status["redis"] = "ok"
	}

	if err := h.db.Ping(ctx); err != nil {
		status["db"] = "error: " + err.Error()
		status["status"] = "degraded"
		code = fiber.StatusServiceUnavailable
	} else {
		status["db"] = "ok"
	}

	return c.Status(code).JSON(status)
}
