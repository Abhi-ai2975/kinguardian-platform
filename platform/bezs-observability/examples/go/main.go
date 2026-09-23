// main.go — Watcher24 Go SDK example application.
//
// Demonstrates all event types (Audit, Log, Trace, Metric, Event), structured
// payloads, trace span trees, explicit Flush, and graceful Shutdown.
//
// Run:
//
//	cp .env.example .env   # fill in WATCHER_API_KEY
//	go run .
package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	watcher "github.com/watcher24/go-sdk"
)

func main() {
	// Load .env for local development.
	// In production set env vars in your container / process environment directly.
	_ = godotenv.Load()

	apiKey := os.Getenv("WATCHER_API_KEY")
	if apiKey == "" {
		log.Fatal("WATCHER_API_KEY is required — copy .env.example to .env and fill it in")
	}

	client, err := watcher.NewClient(watcher.ClientOptions{
		APIKey:      apiKey,
		AppID:       os.Getenv("WATCHER_APP_ID"),
		ServiceName: "example-go-app",
		Environment: envOrDefault("APP_ENV", "development"),
	})
	if err != nil {
		log.Fatalf("watcher: %v", err)
	}
	// Shutdown flushes remaining events before the goroutine exits.
	defer func() {
		if err := client.Shutdown(); err != nil {
			log.Printf("watcher shutdown: %v", err)
		}
	}()

	// ── Audit events ─────────────────────────────────────────────────────────
	// Use Audit for user actions and compliance-relevant operations.

	if err := client.Audit("user.login",
		watcher.WithUserID("u_abc123"),
		watcher.WithSessionID("sess_xyz789"),
		watcher.WithPayload(map[string]any{
			"method":     "email",
			"ip":         "203.0.113.42",
			"user_agent": "Go-http-client/1.1",
		}),
	); err != nil {
		log.Printf("audit: %v", err)
	}

	if err := client.Audit("document.exported",
		watcher.WithUserID("u_abc123"),
		watcher.WithPayload(map[string]any{
			"document_id": "doc_001",
			"format":      "pdf",
			"pages":       42,
		}),
	); err != nil {
		log.Printf("audit: %v", err)
	}

	// ── Log events ───────────────────────────────────────────────────────────
	// Use Log for application-level diagnostic messages.

	_ = client.Log(watcher.SeverityInfo, "server started",
		watcher.WithPayload(map[string]any{
			"port":    8080,
			"version": "1.2.3",
		}),
	)

	_ = client.Log(watcher.SeverityWarn, "cache miss rate elevated",
		watcher.WithPayload(map[string]any{
			"miss_rate_pct": 34.7,
			"cache":         "redis",
		}),
	)

	_ = client.Log(watcher.SeverityError, "payment failed",
		watcher.WithUserID("u_abc123"),
		watcher.WithPayload(map[string]any{
			"order_id": "o_001",
			"reason":   "card_declined",
			"amount":   9900, // cents
		}),
	)

	// ── Trace spans ──────────────────────────────────────────────────────────
	// Build a parent-child span tree for a single inbound request.
	// All spans share the same traceID; parentSpanID links children to parents.

	traceID := fmt.Sprintf("trace-%d", time.Now().UnixNano())
	rootSpanID := "span-handler"

	_ = client.Trace("http.request",
		watcher.WithTraceID(traceID),
		watcher.WithSpanID(rootSpanID),
		watcher.WithPayload(map[string]any{
			"method":     "POST",
			"path":       "/api/orders",
			"status":     201,
			"latency_ms": 87,
		}),
	)

	// Auth check — child of the root handler span
	_ = client.Trace("auth.validate_token",
		watcher.WithTraceID(traceID),
		watcher.WithSpanID("span-auth"),
		watcher.WithParentSpanID(rootSpanID),
		watcher.WithPayload(map[string]any{"latency_ms": 3}),
	)

	// Database write — also a child of root
	_ = client.Trace("db.insert",
		watcher.WithTraceID(traceID),
		watcher.WithSpanID("span-db"),
		watcher.WithParentSpanID(rootSpanID),
		watcher.WithPayload(map[string]any{
			"table":      "orders",
			"latency_ms": 12,
		}),
	)

	// Downstream HTTP call — child of the db span to show nesting
	_ = client.Trace("http.client.notify_warehouse",
		watcher.WithTraceID(traceID),
		watcher.WithSpanID("span-notify"),
		watcher.WithParentSpanID("span-db"),
		watcher.WithPayload(map[string]any{
			"url":        "https://warehouse.internal/notify",
			"status":     200,
			"latency_ms": 45,
		}),
	)

	// ── Metric events ────────────────────────────────────────────────────────
	// Use Metric for numeric measurements. Put values in the payload.

	_ = client.Metric("api.request_duration",
		watcher.WithPayload(map[string]any{
			"p50_ms": 45,
			"p95_ms": 120,
			"p99_ms": 340,
			"count":  1024,
		}),
	)

	_ = client.Metric("db.connection_pool",
		watcher.WithPayload(map[string]any{
			"active":   8,
			"idle":     4,
			"max":      20,
			"wait_ms":  0,
		}),
	)

	// ── Generic event ─────────────────────────────────────────────────────────
	// Use Event when a specific type doesn't have a typed helper.

	_ = client.Event(watcher.EventTypeSecurity, watcher.SeverityWarn,
		"suspicious login attempt",
		watcher.WithPayload(map[string]any{
			"ip":              "198.51.100.1",
			"failed_attempts": 5,
			"blocked":         true,
		}),
	)

	// ── AI agent events ──────────────────────────────────────────────────────
	// Use AI() for all LLM calls, tool executions, workflow steps, and evals.
	// All spans in a workflow share the same wfTraceID so the console renders
	// them as a single waterfall in the AI Events and Traces views.

	wfTraceID  := fmt.Sprintf("wf-%d", time.Now().UnixMilli())
	wfSpanID   := fmt.Sprintf("wf-start-%d", time.Now().UnixMilli())

	// 1 — workflow_start
	_ = client.AI(watcher.SeverityInfo, "workflow.start",
		watcher.WithTraceID(wfTraceID),
		watcher.WithSpanID(wfSpanID),
		watcher.WithPayload(map[string]any{
			"kind":              "workflow_start",
			"workflow_name":     "answer-user-query",
			"workflow_version":  "v1.0",
			"trigger":           "user_message",
			"input_summary":     "User asked about pricing plans",
		}),
	)

	// 2 — retrieval (wiki, vectorless)
	retSpanID := fmt.Sprintf("ret-%d", time.Now().UnixMilli())
	_ = client.AI(watcher.SeverityInfo, "retrieval.completed",
		watcher.WithTraceID(wfTraceID),
		watcher.WithSpanID(retSpanID),
		watcher.WithParentSpanID(wfSpanID),
		watcher.WithPayload(map[string]any{
			"kind":              "retrieval",
			"retrieval_method":  "wiki",
			"source":            "internal-wiki",
			"query_summary":     "pricing plans",
			"chunks_retrieved":  3,
			"top_score":         nil,
			"empty_result":      false,
			"latency_ms":        72,
		}),
	)

	// 3 — llm_call (gpt-4o)
	llmSpanID := fmt.Sprintf("llm-%d", time.Now().UnixMilli())
	_ = client.AI(watcher.SeverityInfo, "llm.call.completed",
		watcher.WithTraceID(wfTraceID),
		watcher.WithSpanID(llmSpanID),
		watcher.WithParentSpanID(wfSpanID),
		watcher.WithPayload(map[string]any{
			"kind":              "llm_call",
			"provider":          "openai",
			"model":             "gpt-4o",
			"prompt_tokens":     840,
			"completion_tokens": 400,
			"total_tokens":      1240,
			"latency_ms":        820,
			"cost_usd":          0.0062,
			"finish_reason":     "stop",
			"cached":            false,
		}),
	)

	// 4 — safety_check (child of llm_call)
	_ = client.AI(watcher.SeverityInfo, "safety.check",
		watcher.WithTraceID(wfTraceID),
		watcher.WithSpanID(fmt.Sprintf("safe-%d", time.Now().UnixMilli())),
		watcher.WithParentSpanID(llmSpanID),
		watcher.WithPayload(map[string]any{
			"kind":            "safety_check",
			"guardrail":       "llama-guard-3",
			"input_flagged":   false,
			"output_flagged":  false,
			"action_taken":    "passed",
			"latency_ms":      28,
		}),
	)

	// 5 — tool_call
	_ = client.AI(watcher.SeverityInfo, "tool.call.completed",
		watcher.WithTraceID(wfTraceID),
		watcher.WithSpanID(fmt.Sprintf("tool-%d", time.Now().UnixMilli())),
		watcher.WithParentSpanID(wfSpanID),
		watcher.WithPayload(map[string]any{
			"kind":           "tool_call",
			"tool_name":      "get_pricing_table",
			"latency_ms":     140,
			"success":        true,
			"output_summary": "Returned 3 pricing tiers",
		}),
	)

	// 6 — workflow_end
	_ = client.AI(watcher.SeverityInfo, "workflow.end",
		watcher.WithTraceID(wfTraceID),
		watcher.WithSpanID(fmt.Sprintf("wf-end-%d", time.Now().UnixMilli())),
		watcher.WithParentSpanID(wfSpanID),
		watcher.WithPayload(map[string]any{
			"kind":            "workflow_end",
			"workflow_name":   "answer-user-query",
			"duration_ms":     1120,
			"total_tokens":    1240,
			"total_cost_usd":  0.0062,
			"steps_taken":     4,
			"outcome":         "success",
		}),
	)

	// 7 — standalone eval_result (not part of the workflow trace)
	_ = client.AI(watcher.SeverityInfo, "eval.result",
		watcher.WithPayload(map[string]any{
			"kind":         "eval_result",
			"evaluator":    "llm-as-judge",
			"metric":       "factual_accuracy",
			"score":        0.87,
			"passed":       true,
		}),
	)

	fmt.Printf("AI workflow sent: trace_id=%s  6 spans\n", wfTraceID)

	// ── Explicit flush ────────────────────────────────────────────────────────
	// In long-running services the background goroutine handles flushing.
	// In short-lived programs or serverless handlers, call Flush explicitly.
	fmt.Println("Flushing events…")
	if err := client.Flush(); err != nil {
		log.Printf("flush: %v", err)
	}
	fmt.Println("Done — all events sent to Watcher24.")
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
