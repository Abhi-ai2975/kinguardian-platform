// Package middleware contains Fiber middleware for the gateway transport layer.
// Middleware sits between the router and the handlers — it handles
// cross-cutting concerns like authentication and rate limiting.
package middleware

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"

	"watcher24/gateway/internal/domain"
	"watcher24/gateway/internal/ports"
)

// Fiber locals keys — used to pass validated context from middleware to handlers.
// Using typed constants avoids typo bugs from raw string keys.
const (
	LocalOrganizationID    = "organization_id"
	LocalAPIKeyID          = "api_key_id"
	LocalApplicationID     = "application_id"
	// LocalEventLimitPerMonth holds the org's monthly event quota resolved from
	// their active subscription plan. -1 means unlimited (enterprise).
	LocalEventLimitPerMonth = "event_limit_per_month"
	// LocalKeyType holds the key type ("secret" or "public") so handlers can
	// apply type-specific logic (rate limiting, source tagging) without re-querying.
	LocalKeyType            = "key_type"
	// LocalMinuteRateLimit holds the per-minute event cap for public tokens.
	// Not set (zero value) for secret keys — handlers must check LocalKeyType first.
	LocalMinuteRateLimit    = "minute_rate_limit"
	// LocalEventSource is "client" for public tokens and "server" for secret keys.
	// "client" covers any client-side context (browser, mobile, desktop) — public
	// tokens are not browser-only. Set here once so every handler gets consistent
	// tagging without extra logic.
	LocalEventSource        = "event_source"
)

// Auth returns a Fiber middleware that validates the API key on every request.
//
// For all keys: extracts and validates the key, stores org/app context in locals.
//
// For public tokens additionally:
//   - If Origin header is present (browser), verifies it is in the token's AllowedOrigins
//     list (403 if not). This prevents a leaked token from being used from unlisted sites.
//   - If Origin header is absent (native mobile / desktop app), the request is allowed —
//     native clients never send Origin, so origin restriction is a browser-only concept.
//   - Stores key type and rate-limit cap so the handler can enforce per-minute limits.
//
// On any failure, the middleware short-circuits with an appropriate HTTP response
// and the handler is never called.
func Auth(validator ports.KeyValidator) fiber.Handler {
	return func(c *fiber.Ctx) error {
		rawKey := extractAPIKey(c)
		if rawKey == "" {
			return respondUnauthorized(c, "missing API key", "MISSING_API_KEY")
		}

		apiKey, err := validator.Validate(c.Context(), rawKey)
		if err != nil {
			return mapKeyError(c, err)
		}

		// Public token: enforce the origin allowlist before storing any context.
		// This check runs before c.Next() so a disallowed request never reaches the handler.
		if apiKey.KeyType == domain.KeyTypePublic {
			origin := c.Get("Origin")
			if !originAllowed(origin, apiKey.AllowedOrigins) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "origin not allowed",
					"code":  "ORIGIN_NOT_ALLOWED",
				})
			}
		}

		// Determine event source from key type — set once here, used by all handlers.
		eventSource := "server"
		if apiKey.KeyType == domain.KeyTypePublic {
			eventSource = "client"
		}

		// Store resolved context in locals so handlers can read it without
		// re-querying the database.
		c.Locals(LocalOrganizationID, apiKey.OrganizationID)
		c.Locals(LocalAPIKeyID, apiKey.ID)
		c.Locals(LocalApplicationID, apiKey.AppID)
		c.Locals(LocalEventLimitPerMonth, apiKey.EventLimitPerMonth)
		c.Locals(LocalKeyType, string(apiKey.KeyType))
		c.Locals(LocalMinuteRateLimit, apiKey.MinuteRateLimit)
		c.Locals(LocalEventSource, eventSource)

		return c.Next()
	}
}

// originAllowed returns true if the request origin is permitted for this public token.
// An empty allowlist (secret keys) is never checked — callers must guard with KeyTypePublic.
//
// Empty origin string = native client (mobile app, desktop app, curl).
// Browsers always send Origin; native clients never do. Allowing empty-origin requests
// means public tokens work for both browser and mobile SDKs. The token is still
// write-only and rate-limited regardless of origin, so the attack surface is bounded.
// Only reject when a browser sends an Origin that is not in the allowlist.
func originAllowed(origin string, allowedOrigins []string) bool {
	if origin == "" {
		// No Origin header — native client (React Native, Swift, Kotlin, etc.).
		return true
	}
	for _, allowed := range allowedOrigins {
		if strings.EqualFold(origin, allowed) {
			return true
		}
	}
	return false
}

// extractAPIKey tries Authorization header first, then X-API-Key.
// Returns empty string if neither is present.
func extractAPIKey(c *fiber.Ctx) string {
	// Standard Bearer token format: "Authorization: Bearer wtch_..."
	if auth := c.Get("Authorization"); auth != "" {
		if after, ok := strings.CutPrefix(auth, "Bearer "); ok {
			return strings.TrimSpace(after)
		}
	}

	// Alternative header for SDK convenience: "X-API-Key: wtch_..."
	if key := c.Get("X-API-Key"); key != "" {
		return strings.TrimSpace(key)
	}

	return ""
}

// mapKeyError translates domain API key errors into appropriate HTTP responses.
func mapKeyError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrAPIKeyNotFound):
		return respondUnauthorized(c, "invalid API key", "INVALID_API_KEY")
	case errors.Is(err, domain.ErrAPIKeyDisabled):
		return respondUnauthorized(c, "API key is disabled", "INVALID_API_KEY")
	case errors.Is(err, domain.ErrAPIKeyExpired):
		return respondUnauthorized(c, "API key has expired", "INVALID_API_KEY")
	default:
		// Don't expose internal errors to the client — log server-side, return generic message
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "internal server error",
			"code":  "INTERNAL_ERROR",
		})
	}
}

func respondUnauthorized(c *fiber.Ctx, message, code string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": message,
		"code":  code,
	})
}
