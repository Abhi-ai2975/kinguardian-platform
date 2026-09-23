// Package handlers contains the HTTP handler functions for the notifier service.
// Handlers are the outermost transport layer — they parse HTTP, call use cases,
// and return JSON. No business logic lives here.
package handlers

import (
	"encoding/json"
	"log"

	"github.com/gofiber/fiber/v2"

	"watcher24/notifier/internal/domain"
	"watcher24/notifier/internal/usecases"
)

// NotifyHandler handles the POST /api/internal/notify endpoint.
// Called by the console and IAM to trigger transactional notifications
// (welcome email, API key created, team invitation, etc.).
type NotifyHandler struct {
	deliver *usecases.DeliverNotificationUseCase
}

// NewNotifyHandler constructs the handler with the deliver use case injected.
func NewNotifyHandler(deliver *usecases.DeliverNotificationUseCase) *NotifyHandler {
	return &NotifyHandler{deliver: deliver}
}

// notifyRequest is the JSON body shape for POST /api/internal/notify.
type notifyRequest struct {
	OrgID    string         `json:"org_id"`
	UserID   string         `json:"user_id"`
	Template string         `json:"template"`
	Channels []string       `json:"channels"`
	DedupKey string         `json:"dedup_key"`
	Data     map[string]any `json:"data"`
}

// Handle processes POST /api/internal/notify.
// Returns 202 Accepted immediately — external channel delivery happens asynchronously.
func (h *NotifyHandler) Handle(c *fiber.Ctx) error {
	var req notifyRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid JSON body",
			"code":  "BAD_REQUEST",
		})
	}

	if req.OrgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "org_id is required",
			"code":  "BAD_REQUEST",
		})
	}
	if req.Template == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "template is required",
			"code":  "BAD_REQUEST",
		})
	}

	channels := make([]domain.Channel, 0, len(req.Channels))
	for _, ch := range req.Channels {
		channels = append(channels, domain.Channel(ch))
	}
	// Default to email + in_app when no channels are specified.
	if len(channels) == 0 {
		channels = []domain.Channel{domain.ChannelEmail, domain.ChannelInApp}
	}

	notifReq := &domain.NotificationRequest{
		OrgID:    req.OrgID,
		UserID:   req.UserID,
		Template: req.Template,
		Channels: channels,
		DedupKey: req.DedupKey,
		Data:     req.Data,
	}

	if err := h.deliver.Execute(c.Context(), notifReq); err != nil {
		log.Printf("notify handler: execute: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to deliver notification",
			"code":  "INTERNAL_ERROR",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"ok": true})
}
