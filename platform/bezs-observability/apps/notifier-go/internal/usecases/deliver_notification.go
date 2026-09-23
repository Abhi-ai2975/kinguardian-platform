// deliver_notification.go — use case for delivering a notification to all
// configured channels.
//
// This is the central business logic of the notifier service. It:
//   1. Checks dedup (drops duplicate alert notifications within cooldown)
//   2. Renders the template with the provided data
//   3. For each requested channel, dispatches to the registered sender
//   4. Records the delivery attempt (success or failure) in PostgreSQL
//   5. Writes in-app notifications synchronously; sends email asynchronously
//
// This use case depends only on port interfaces — never on SMTP, Redis, or pgx directly.
package usecases

import (
	"context"
	"fmt"
	"log"

	"watcher24/notifier/internal/domain"
	"watcher24/notifier/internal/ports"
)

// DeliverNotificationUseCase routes a NotificationRequest to the appropriate
// channel senders and records each delivery attempt.
type DeliverNotificationUseCase struct {
	senders      map[domain.Channel]ports.Sender
	deliveries   ports.DeliveryStore
	inApp        ports.InAppStore
	channelCfg   ports.ChannelConfigStore
	dedup        ports.DedupStore
	pubsub       ports.NotificationPubSub
}

// NewDeliverNotificationUseCase wires the use case with the required adapters.
// senderList is the slice of all registered channel senders — the use case
// indexes them by channel for O(1) dispatch.
// pubsub is used to emit a real-time signal after each in-app write so that
// connected SSE clients can invalidate their notification cache immediately.
func NewDeliverNotificationUseCase(
	senderList []ports.Sender,
	deliveries ports.DeliveryStore,
	inApp ports.InAppStore,
	channelCfg ports.ChannelConfigStore,
	dedup ports.DedupStore,
	pubsub ports.NotificationPubSub,
) *DeliverNotificationUseCase {
	senderMap := make(map[domain.Channel]ports.Sender, len(senderList))
	for _, s := range senderList {
		senderMap[s.Channel()] = s
	}
	return &DeliverNotificationUseCase{
		senders:    senderMap,
		deliveries: deliveries,
		inApp:      inApp,
		channelCfg: channelCfg,
		dedup:      dedup,
		pubsub:     pubsub,
	}
}

// Execute processes a single NotificationRequest.
// In-app writes happen synchronously (they are fast DB inserts).
// Email and other external channel sends happen in goroutines so the caller
// does not block waiting for SMTP or webhook delivery.
func (uc *DeliverNotificationUseCase) Execute(ctx context.Context, req *domain.NotificationRequest) error {
	// Dedup check — drop duplicate alert notifications within the cooldown window.
	// Transactional notifications (welcome_email, etc.) never have a dedup key.
	if req.DedupKey != "" {
		dup, err := uc.dedup.IsDuplicate(ctx, req.DedupKey)
		if err != nil {
			log.Printf("deliver: dedup check error for key %q: %v", req.DedupKey, err)
			// Non-fatal: proceed with delivery rather than silently dropping on error.
		} else if dup {
			log.Printf("deliver: dropping duplicate notification (key=%s template=%s)", req.DedupKey, req.Template)
			return nil
		}
		// Mark as seen with a 1-hour TTL (the evaluator's cooldown controls storm frequency).
		_ = uc.dedup.SetSeen(ctx, req.DedupKey, 3600)
	}

	// Render the template once — all channels receive the same rendered content.
	msg, err := domain.Render(req.Template, req.Data)
	if err != nil {
		return fmt.Errorf("deliver: render template %q: %w", req.Template, err)
	}

	for _, ch := range req.Channels {
		// In-app is handled directly via a DB insert — it has no Sender adapter.
		// Check this before the sender lookup so it is never skipped.
		if ch == domain.ChannelInApp {
			uc.deliverInApp(ctx, req, msg)
			continue
		}

		sender, ok := uc.senders[ch]
		if !ok {
			log.Printf("deliver: no sender registered for channel %q — skipping", ch)
			continue
		}

		// External channels (email, slack, webhook) are sent asynchronously
		// so the caller returns immediately without waiting for SMTP/HTTP.
		go uc.deliverAsync(req, msg, sender, ch)
	}

	return nil
}

// deliverInApp writes an in_app_notifications row, records the delivery, and
// publishes a lightweight real-time signal so connected SSE clients can
// invalidate their notification cache without waiting for the next poll.
func (uc *DeliverNotificationUseCase) deliverInApp(ctx context.Context, req *domain.NotificationRequest, msg *domain.RenderedMessage) {
	deliveryID, err := uc.deliveries.Create(ctx, req.OrgID, req.Template, domain.ChannelInApp)
	if err != nil {
		log.Printf("deliver: create delivery record (in_app): %v", err)
		return
	}

	n := &domain.InAppNotification{
		OrgID:    req.OrgID,
		UserID:   req.UserID,
		Title:    msg.Title,
		Body:     msg.Body,
		Severity: severityFromData(req.Data),
	}

	if err := uc.inApp.Create(ctx, n); err != nil {
		log.Printf("deliver: write in-app notification: %v", err)
		_ = uc.deliveries.MarkFailed(ctx, deliveryID, err.Error())
		return
	}

	_ = uc.deliveries.MarkSent(ctx, deliveryID)

	// Publish a real-time signal so SSE subscribers invalidate immediately.
	// Non-fatal — a publish failure only degrades to polling, never loses data.
	if uc.pubsub != nil {
		go func() {
			if err := uc.pubsub.Publish(context.Background(), req.OrgID); err != nil {
				log.Printf("deliver: pubsub publish (non-fatal): %v", err)
			}
		}()
	}
}

// deliverAsync sends to an external channel in a goroutine with simple retry.
// Uses a background context so the delivery continues even after the HTTP
// request that triggered it has returned.
func (uc *DeliverNotificationUseCase) deliverAsync(req *domain.NotificationRequest, msg *domain.RenderedMessage, sender ports.Sender, ch domain.Channel) {
	ctx := context.Background()

	deliveryID, err := uc.deliveries.Create(ctx, req.OrgID, req.Template, ch)
	if err != nil {
		log.Printf("deliver: create delivery record (%s): %v", ch, err)
		return
	}

	if err := sender.Send(ctx, req, msg); err != nil {
		log.Printf("deliver: send via %s failed: %v", ch, err)
		_ = uc.deliveries.MarkFailed(ctx, deliveryID, err.Error())
		return
	}

	_ = uc.deliveries.MarkSent(ctx, deliveryID)
	log.Printf("deliver: sent via %s (org=%s template=%s)", ch, req.OrgID, req.Template)
}

// severityFromData extracts the severity field from the notification data map,
// defaulting to "info" when not present.
func severityFromData(data map[string]any) string {
	if v, ok := data["severity"]; ok {
		if s, ok := v.(string); ok && s != "" {
			return s
		}
	}
	return "info"
}
