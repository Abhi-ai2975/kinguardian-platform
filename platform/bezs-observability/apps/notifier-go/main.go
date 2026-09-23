// main.go is the composition root for notifier-go.
//
// Startup order:
//   1. Load config from environment
//   2. Connect to PostgreSQL (watcher24 DB) and Redis
//   3. Create adapters (implement ports)
//   4. Create use cases (inject adapters via port interfaces)
//   5. Create HTTP handlers (inject use cases)
//   6. Start stream:notify consumer goroutine
//   7. Start HTTP server with graceful shutdown
package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"watcher24/notifier/config"
	pgadapter "watcher24/notifier/internal/adapters/postgres"
	redisadapter "watcher24/notifier/internal/adapters/redis"
	smtpadapter "watcher24/notifier/internal/adapters/smtp"
	"watcher24/notifier/internal/domain"
	"watcher24/notifier/internal/ports"
	"watcher24/notifier/internal/transport"
	"watcher24/notifier/internal/transport/handlers"
	"watcher24/notifier/internal/usecases"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ── 1. Load configuration ─────────────────────────────────────────────────
	cfg := config.Load()
	log.Printf("notifier: starting in %s mode on :%s", cfg.Env, cfg.Port)

	// ── 2. Connect to infrastructure ─────────────────────────────────────────
	pgPool, err := pgadapter.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("notifier: failed to connect to PostgreSQL: %v", err)
	}
	defer pgPool.Close()
	log.Println("notifier: connected to PostgreSQL (watcher24 DB)")

	streamConsumer, err := redisadapter.NewStreamConsumerAdapter(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("notifier: failed to connect to Redis: %v", err)
	}
	defer streamConsumer.Close() //nolint:errcheck
	log.Println("notifier: connected to Redis (stream:notify consumer)")

	pubSubAdapter, err := redisadapter.NewPubSubAdapter(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("notifier: failed to connect to Redis (pub/sub): %v", err)
	}
	defer pubSubAdapter.Close() //nolint:errcheck
	log.Println("notifier: connected to Redis (pub/sub)")

	// ── 3. Create adapters ────────────────────────────────────────────────────
	deliveryStore := pgPool.DeliveryStore()
	inAppStore    := pgPool.InAppStore()
	channelCfg    := pgPool.ChannelConfigStore()
	dedupStore    := redisadapter.NewDedupStoreAdapter(streamConsumer.Client())

	emailSender := smtpadapter.NewEmailSender(
		smtpadapter.SMTPOptions{
			Host:     cfg.SMTPHost,
			Port:     cfg.SMTPPort,
			Email:    cfg.SMTPEmail,
			Password: cfg.SMTPPassword,
			FromName: cfg.SMTPFromName,
		},
		channelCfg,
	)

	// Build the sender list from CHANNELS_ENABLED — only register senders for
	// channels that are configured. Phase 1: email + in_app only.
	enabledChannels := strings.Split(cfg.ChannelsEnabled, ",")
	senderList := buildSenderList(enabledChannels, emailSender)

	// ── 4. Create use cases ───────────────────────────────────────────────────
	deliverUC  := usecases.NewDeliverNotificationUseCase(senderList, deliveryStore, inAppStore, channelCfg, dedupStore, pubSubAdapter)
	markReadUC := usecases.NewMarkReadUseCase(inAppStore)

	// ── 5. Create handlers ────────────────────────────────────────────────────
	notifyHandler := handlers.NewNotifyHandler(deliverUC)
	inAppHandler  := handlers.NewInAppHandler(markReadUC, inAppStore)
	streamHandler := handlers.NewStreamHandler(pubSubAdapter)

	// ── 6. Start stream:notify consumer goroutine ─────────────────────────────
	go runStreamConsumer(ctx, streamConsumer, deliverUC)
	log.Println("notifier: stream:notify consumer started")

	// ── 7. Start HTTP server with graceful shutdown ───────────────────────────
	app := transport.NewServer(cfg.InternalSecret, notifyHandler, inAppHandler, streamHandler)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("notifier: shutting down...")
		cancel() // stop the stream consumer
		_ = app.Shutdown()
	}()

	log.Printf("notifier: listening on :%s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Printf("notifier: server stopped: %v", err)
	}
	log.Println("notifier: stopped")
}

// runStreamConsumer reads from stream:notify in a loop and calls the deliver use case.
// Runs in a goroutine; exits when ctx is cancelled (on shutdown).
func runStreamConsumer(ctx context.Context, consumer ports.StreamConsumer, deliver *usecases.DeliverNotificationUseCase) {
	// Recover pending messages from a previous crash before processing new ones.
	pending, err := consumer.ClaimPending(ctx, 100, 30_000)
	if err != nil {
		log.Printf("stream consumer: claim pending: %v", err)
	}
	if len(pending) > 0 {
		log.Printf("stream consumer: recovering %d pending messages", len(pending))
		processMessages(ctx, pending, consumer, deliver)
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		msgs, err := consumer.ReadBatch(ctx, 50, 2000)
		if err != nil {
			log.Printf("stream consumer: read error: %v", err)
			time.Sleep(time.Second)
			continue
		}
		if len(msgs) == 0 {
			continue
		}
		processMessages(ctx, msgs, consumer, deliver)
	}
}

// processMessages delivers each stream message and ACKs on success.
func processMessages(ctx context.Context, msgs []*ports.StreamMessage, consumer ports.StreamConsumer, deliver *usecases.DeliverNotificationUseCase) {
	var ackIDs []string

	for _, msg := range msgs {
		req, err := parseStreamMessage(msg)
		if err != nil {
			log.Printf("stream consumer: parse message %s: %v", msg.ID, err)
			ackIDs = append(ackIDs, msg.ID) // ACK malformed messages to avoid poison pills
			continue
		}

		if err := deliver.Execute(ctx, req); err != nil {
			log.Printf("stream consumer: deliver %s: %v", msg.ID, err)
			// Do NOT ack on deliver failure — leave pending so it can be retried.
			continue
		}

		ackIDs = append(ackIDs, msg.ID)
	}

	if len(ackIDs) > 0 {
		if err := consumer.Ack(ctx, ackIDs...); err != nil {
			log.Printf("stream consumer: ack error: %v", err)
		}
	}
}

// parseStreamMessage converts the raw stream fields into a NotificationRequest.
// The stream:notify message shape is defined in docs/notifications-service.md.
func parseStreamMessage(msg *ports.StreamMessage) (*domain.NotificationRequest, error) {
	getString := func(key string) string {
		if v, ok := msg.Fields[key]; ok {
			if s, ok := v.(string); ok {
				return s
			}
		}
		return ""
	}

	orgID    := getString("org_id")
	userID   := getString("user_id")
	template := getString("template")
	dedupKey := getString("dedup_key")

	var channels []domain.Channel
	if chStr := getString("channels"); chStr != "" {
		var raw []string
		if err := json.Unmarshal([]byte(chStr), &raw); err == nil {
			for _, ch := range raw {
				channels = append(channels, domain.Channel(ch))
			}
		}
	}
	if len(channels) == 0 {
		channels = []domain.Channel{domain.ChannelEmail, domain.ChannelInApp}
	}

	var data map[string]any
	if dataStr := getString("data"); dataStr != "" {
		_ = json.Unmarshal([]byte(dataStr), &data)
	}
	if data == nil {
		data = map[string]any{}
	}

	// Copy severity from top-level field into data so templates can reference it.
	if sev := getString("severity"); sev != "" {
		data["severity"] = sev
	}

	return &domain.NotificationRequest{
		OrgID:    orgID,
		UserID:   userID,
		Template: template,
		Channels: channels,
		DedupKey: dedupKey,
		Data:     data,
	}, nil
}

// buildSenderList constructs the slice of senders for channels that are enabled.
// The in-app channel is always active — it has no external dependency.
func buildSenderList(enabled []string, email *smtpadapter.EmailSender) []ports.Sender {
	set := make(map[string]bool, len(enabled))
	for _, ch := range enabled {
		set[strings.TrimSpace(ch)] = true
	}

	var senders []ports.Sender
	if set["email"] {
		senders = append(senders, email)
	}
	// In-app is handled directly by the use case (synchronous DB insert),
	// not via the Sender interface — no sender adapter needed for it.
	return senders
}
