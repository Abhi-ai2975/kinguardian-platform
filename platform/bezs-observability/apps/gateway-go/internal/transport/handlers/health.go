// Package handlers contains the Fiber HTTP handlers for the gateway.
// Handlers are thin — they parse the request, call use cases, and return responses.
// No business logic lives here.
package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
)

// HealthChecker is the minimal interface for dependency health checks.
// Both the Redis and Postgres adapters implement this.
type HealthChecker interface {
	Ping(ctx context.Context) error
}

// HealthHandler holds the dependencies needed to report system health.
type HealthHandler struct {
	redis    HealthChecker
	iamDB    HealthChecker
}

// NewHealthHandler creates the handler with references to the infrastructure
// dependencies that need to be health-checked.
func NewHealthHandler(redis, iamDB HealthChecker) *HealthHandler {
	return &HealthHandler{redis: redis, iamDB: iamDB}
}

// Handle responds to GET /health.
// Checks Redis and IAM database connectivity and returns their status.
// Returns 200 if all dependencies are healthy, 503 if any are down.
//
// No authentication required — load balancers and Kubernetes liveness
// probes call this endpoint without credentials.
func (h *HealthHandler) Handle(c *fiber.Ctx) error {
	// Use a short timeout so a slow dependency doesn't hold up the health check.
	ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
	defer cancel()

	redisStatus := "ok"
	iamDBStatus := "ok"
	allHealthy := true

	if err := h.redis.Ping(ctx); err != nil {
		redisStatus = "unreachable"
		allHealthy = false
	}

	if err := h.iamDB.Ping(ctx); err != nil {
		iamDBStatus = "unreachable"
		allHealthy = false
	}

	statusCode := fiber.StatusOK
	overallStatus := "ok"
	if !allHealthy {
		statusCode = fiber.StatusServiceUnavailable
		overallStatus = "degraded"
	}

	return c.Status(statusCode).JSON(fiber.Map{
		"status": overallStatus,
		"redis":  redisStatus,
		"iam_db": iamDBStatus,
	})
}
