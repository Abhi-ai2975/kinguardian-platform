// Package handlers — see health.go for package description.
package handlers

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"

	"watcher24/gateway/internal/domain"
	"watcher24/gateway/internal/ports"
	"watcher24/gateway/internal/transport/middleware"
	"watcher24/gateway/internal/usecases"
)

// eventRequest is the JSON shape expected from SDKs.
// OrganizationID is intentionally absent — it is resolved from the API key,
// not trusted from the request body.
type eventRequest struct {
	ApplicationID string         `json:"application_id"`
	Environment   string         `json:"environment"`
	EventType     string         `json:"event_type"`
	Severity      string         `json:"severity"`
	Message       string         `json:"message"`
	Timestamp     *time.Time     `json:"timestamp"`
	TraceID       string         `json:"trace_id"`
	SpanID        string         `json:"span_id"`
	ParentSpanID  string         `json:"parent_span_id"`
	UserID        string         `json:"user_id"`
	SessionID     string         `json:"session_id"`
	Payload       map[string]any `json:"payload"`
}

// EventsHandler handles all telemetry ingestion endpoints.
type EventsHandler struct {
	ingestUC       *usecases.IngestEventUseCase
	rateLimiter    ports.MinuteRateLimiter
	geoResolver    ports.GeoResolver
	defaultCountry string // fallback ISO alpha-2 for private/loopback IPs (local dev)
}

// NewEventsHandler creates the handler with its required dependencies.
// defaultCountry is used when GeoIP cannot resolve the client IP — set it to
// your ISO alpha-2 code in local dev so the map shows data without real traffic.
func NewEventsHandler(ingestUC *usecases.IngestEventUseCase, rateLimiter ports.MinuteRateLimiter, geoResolver ports.GeoResolver, defaultCountry string) *EventsHandler {
	return &EventsHandler{ingestUC: ingestUC, rateLimiter: rateLimiter, geoResolver: geoResolver, defaultCountry: defaultCountry}
}

// HandleEvents handles POST /v1/events — accepts single event or batch (array).
func (h *EventsHandler) HandleEvents(c *fiber.Ctx) error {
	return h.handle(c, "")
}

// HandleLogs handles POST /v1/logs — shorthand for event_type: "log".
func (h *EventsHandler) HandleLogs(c *fiber.Ctx) error {
	return h.handle(c, string(domain.EventTypeLog))
}

// HandleTraces handles POST /v1/traces — shorthand for event_type: "trace".
func (h *EventsHandler) HandleTraces(c *fiber.Ctx) error {
	return h.handle(c, string(domain.EventTypeTrace))
}

// HandleMetrics handles POST /v1/metrics — shorthand for event_type: "metric".
func (h *EventsHandler) HandleMetrics(c *fiber.Ctx) error {
	return h.handle(c, string(domain.EventTypeMetric))
}

// HandleAudit handles POST /v1/audit — shorthand for event_type: "audit".
func (h *EventsHandler) HandleAudit(c *fiber.Ctx) error {
	return h.handle(c, string(domain.EventTypeAudit))
}

// handle is the shared implementation for all event ingestion endpoints.
// forcedType overrides the event_type in the body (used by typed endpoints
// like /v1/logs). An empty string means the body's event_type is used.
func (h *EventsHandler) handle(c *fiber.Ctx, forcedType string) error {
	orgID, ok := c.Locals(middleware.LocalOrganizationID).(string)
	if !ok || orgID == "" {
		// This should never happen — auth middleware runs first.
		// If it does, it means middleware was bypassed, which is a bug.
		return respondError(c, fiber.StatusInternalServerError, "missing org context", "INTERNAL_ERROR")
	}

	appID, _ := c.Locals(middleware.LocalApplicationID).(string)
	eventLimit, _ := c.Locals(middleware.LocalEventLimitPerMonth).(int64)
	keyType, _ := c.Locals(middleware.LocalKeyType).(string)
	eventSource, _ := c.Locals(middleware.LocalEventSource).(string)

	// Per-minute rate limit check — only for public (browser) tokens.
	// Secret keys are server-controlled and subject only to the monthly plan quota.
	if keyType == string(domain.KeyTypePublic) {
		keyID, _ := c.Locals(middleware.LocalAPIKeyID).(string)
		minuteLimit, _ := c.Locals(middleware.LocalMinuteRateLimit).(int64)
		if err := h.rateLimiter.Allow(c.Context(), keyID, minuteLimit); err != nil {
			if errors.Is(err, domain.ErrMinuteRateExceeded) {
				return respondError(c, fiber.StatusTooManyRequests, "per-minute rate limit exceeded", "RATE_LIMIT_EXCEEDED")
			}
		}
	}

	// Detect if the body is an array (batch) or a single object.
	body := c.Body()
	if len(body) > 0 && body[0] == '[' {
		return h.handleBatch(c, orgID, appID, forcedType, eventLimit, eventSource)
	}
	return h.handleSingle(c, orgID, appID, forcedType, eventLimit, eventSource)
}

// handleSingle processes a single event from the request body.
func (h *EventsHandler) handleSingle(c *fiber.Ctx, orgID, appID, forcedType string, eventLimit int64, eventSource string) error {
	var req eventRequest
	if err := c.BodyParser(&req); err != nil {
		return respondError(c, fiber.StatusBadRequest, "invalid JSON body", "INVALID_PAYLOAD")
	}

	input := h.buildInput(req, orgID, appID, forcedType, eventLimit, eventSource, c)
	if err := h.ingestUC.Execute(c.Context(), input); err != nil {
		return mapUseCaseError(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok"})
}

// handleBatch processes an array of events from the request body.
func (h *EventsHandler) handleBatch(c *fiber.Ctx, orgID, appID, forcedType string, eventLimit int64, eventSource string) error {
	var reqs []eventRequest
	if err := c.BodyParser(&reqs); err != nil {
		return respondError(c, fiber.StatusBadRequest, "invalid JSON array", "INVALID_PAYLOAD")
	}

	inputs := make([]usecases.IngestInput, len(reqs))
	for i, req := range reqs {
		inputs[i] = h.buildInput(req, orgID, appID, forcedType, eventLimit, eventSource, c)
	}

	if err := h.ingestUC.ExecuteBatch(c.Context(), usecases.IngestBatchInput{Events: inputs}); err != nil {
		return mapUseCaseError(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok", "count": len(reqs)})
}

// buildInput converts the HTTP request into a use case input struct.
// Enrichment metadata (IP, SDK version, region) is read from the request here
// and passed to the use case — the use case itself doesn't know about HTTP.
// appID comes exclusively from the API key's linked app (set by auth middleware).
// Any appId value in the request body or SDK config is intentionally ignored.
// eventSource is determined by key type in auth middleware — never from the request body.
func (h *EventsHandler) buildInput(req eventRequest, orgID, appID, forcedType string, eventLimit int64, eventSource string, c *fiber.Ctx) usecases.IngestInput {
	eventType := req.EventType
	if forcedType != "" {
		eventType = forcedType
	}

	return usecases.IngestInput{
		OrganizationID:     orgID,
		EventLimitPerMonth: eventLimit,
		ApplicationID:      appID,
		Environment:        req.Environment,
		EventType:          domain.EventType(eventType),
		Severity:           domain.Severity(req.Severity),
		Message:            req.Message,
		Timestamp:          req.Timestamp,
		TraceID:            req.TraceID,
		SpanID:             req.SpanID,
		ParentSpanID:       req.ParentSpanID,
		UserID:             req.UserID,
		SessionID:          req.SessionID,
		Payload:            req.Payload,
		Source:             eventSource,
		ServiceName:        c.Get("X-Service-Name"),
		// Enrichment from HTTP context — Region is the ISO alpha-2 country code
		// resolved from the client IP via GeoIP. Private/loopback IPs (local dev)
		// return "" from the resolver; fall back to the configured default so the
		// dashboard map shows data even when running on localhost.
		IPAddress:  c.IP(),
		SDKVersion: c.Get("X-SDK-Version"),
		Runtime:    c.Get("X-Runtime"),
		Region:     h.resolveRegion(c),
	}
}

// mapUseCaseError translates use case errors into HTTP responses.
func mapUseCaseError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrEventLimitExceeded):
		return respondError(c, fiber.StatusTooManyRequests, "monthly event limit exceeded — upgrade your plan", "EVENT_LIMIT_EXCEEDED")
	case errors.Is(err, usecases.ErrBatchTooLarge):
		return respondError(c, fiber.StatusRequestEntityTooLarge, err.Error(), "BATCH_TOO_LARGE")
	case errors.Is(err, usecases.ErrMissingMessage),
		errors.Is(err, usecases.ErrInvalidEventType),
		errors.Is(err, usecases.ErrInvalidSeverity):
		return respondError(c, fiber.StatusBadRequest, err.Error(), "INVALID_PAYLOAD")
	default:
		return respondError(c, fiber.StatusInternalServerError, "internal server error", "INTERNAL_ERROR")
	}
}

func respondError(c *fiber.Ctx, status int, message, code string) error {
	return c.Status(status).JSON(fiber.Map{
		"error": message,
		"code":  code,
	})
}

// resolveRegion returns an ISO alpha-2 country code for the request.
// It tries X-Forwarded-For first (set by proxies/CDNs), then the direct client
// IP. If GeoIP returns "" (private/loopback), it falls back to defaultCountry.
func (h *EventsHandler) resolveRegion(c *fiber.Ctx) string {
	// Prefer the real client IP forwarded by a proxy or CDN.
	ip := c.Get("X-Forwarded-For")
	if ip == "" {
		ip = c.IP()
	}
	if code := h.geoResolver.Resolve(c.Context(), ip); code != "" {
		return code
	}
	return h.defaultCountry
}
