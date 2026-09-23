// in_app.go handles internal API routes for in-app notification management.
// These endpoints are called by the console (proxying on behalf of the authed user),
// protected by X-Internal-Secret. They expose list, read, and unread-count operations.
package handlers

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"watcher24/notifier/internal/ports"
	"watcher24/notifier/internal/usecases"
)

// InAppHandler handles GET/PATCH /api/internal/notifications routes.
type InAppHandler struct {
	markRead *usecases.MarkReadUseCase
	inApp    ports.InAppStore
}

// NewInAppHandler constructs the handler with required dependencies.
func NewInAppHandler(markRead *usecases.MarkReadUseCase, inApp ports.InAppStore) *InAppHandler {
	return &InAppHandler{markRead: markRead, inApp: inApp}
}

// HandleList handles GET /api/internal/notifications?org_id=...&limit=...
// Returns the most recent in-app notifications for the org.
func (h *InAppHandler) HandleList(c *fiber.Ctx) error {
	orgID := c.Query("org_id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "org_id is required",
			"code":  "BAD_REQUEST",
		})
	}

	limit := 20
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}

	notifications, err := h.inApp.ListByOrg(c.Context(), orgID, limit)
	if err != nil {
		log.Printf("in-app list: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch notifications",
			"code":  "INTERNAL_ERROR",
		})
	}

	unread, err := h.inApp.UnreadCount(c.Context(), orgID)
	if err != nil {
		log.Printf("in-app unread count: %v", err)
	}

	return c.JSON(fiber.Map{
		"notifications": notifications,
		"unread_count":  unread,
	})
}

// HandleMarkRead handles PATCH /api/internal/notifications/:id/read
// Marks a single notification as read. org_id must be passed as a query param
// so the store can scope the update and prevent cross-org access.
func (h *InAppHandler) HandleMarkRead(c *fiber.Ctx) error {
	id := c.Params("id")
	orgID := c.Query("org_id")
	if id == "" || orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "id and org_id are required",
			"code":  "BAD_REQUEST",
		})
	}

	if err := h.markRead.MarkOne(c.Context(), id, orgID); err != nil {
		log.Printf("in-app mark read: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to mark notification as read",
			"code":  "INTERNAL_ERROR",
		})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// HandleMarkAllRead handles PATCH /api/internal/notifications/read-all?org_id=...
func (h *InAppHandler) HandleMarkAllRead(c *fiber.Ctx) error {
	orgID := c.Query("org_id")
	if orgID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "org_id is required",
			"code":  "BAD_REQUEST",
		})
	}

	if err := h.markRead.MarkAll(c.Context(), orgID); err != nil {
		log.Printf("in-app mark all read: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to mark all notifications as read",
			"code":  "INTERNAL_ERROR",
		})
	}

	return c.JSON(fiber.Map{"ok": true})
}
