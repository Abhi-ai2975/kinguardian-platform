// main.rs — Watcher24 Rust SDK example.
//
// Demonstrates all event types (audit, log, trace, metric, event),
// structured payloads, trace span trees, explicit Flush, and Shutdown.
//
// Run:
//   cp .env.example .env   # fill in WATCHER_API_KEY
//   cargo run
use std::env;

use serde_json::json;
use watcher_sdk::{Client, EventType, Severity};

fn main() -> watcher_sdk::Result<()> {
    // Load .env for local development.
    // In production, set env vars in your container / systemd unit directly.
    dotenvy::dotenv().ok();

    let api_key = env::var("WATCHER_API_KEY")
        .expect("WATCHER_API_KEY is required — copy .env.example to .env");

    let client = Client::builder(api_key)
        .app_id(env::var("WATCHER_APP_ID").unwrap_or_default())
        .service_name("example-rust-app")
        .environment(env::var("APP_ENV").unwrap_or_else(|_| "development".to_owned()))
        .build()?;

    // ── Audit events ─────────────────────────────────────────────────────────
    // Use Audit for user actions and compliance-relevant operations.

    client.audit("user.login")
        .user_id("u_abc123")
        .session_id("sess_xyz789")
        .payload(json!({
            "method":     "email",
            "ip":         "203.0.113.42",
            "user_agent": "Mozilla/5.0",
        }))
        .send()?;

    client.audit("document.exported")
        .user_id("u_abc123")
        .payload(json!({
            "document_id": "doc_001",
            "format":      "pdf",
            "pages":       42,
        }))
        .send()?;

    // ── Log events ───────────────────────────────────────────────────────────
    // Use Log for application-level diagnostic messages.

    client.log(Severity::Info, "server started")
        .payload(json!({ "port": 8080, "version": "1.2.3" }))
        .send()?;

    client.log(Severity::Warn, "cache miss rate elevated")
        .payload(json!({ "miss_rate_pct": 34.7, "cache": "redis" }))
        .send()?;

    client.log(Severity::Error, "payment failed")
        .user_id("u_abc123")
        .payload(json!({
            "order_id": "o_001",
            "reason":   "card_declined",
            "amount":   9900,   // cents
        }))
        .send()?;

    // ── Trace spans ──────────────────────────────────────────────────────────
    // Build a parent-child span tree for a single inbound request.

    let trace_id = format!("trace-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos());
    let root_span = "span-handler";

    client.trace("http.request")
        .trace_id(&trace_id)
        .span_id(root_span)
        .payload(json!({
            "method":     "POST",
            "path":       "/api/orders",
            "status":     201,
            "latency_ms": 87,
        }))
        .send()?;

    // Auth check — child of root
    client.trace("auth.validate_token")
        .trace_id(&trace_id)
        .span_id("span-auth")
        .parent_span_id(root_span)
        .payload(json!({ "latency_ms": 3 }))
        .send()?;

    // DB write — child of root
    client.trace("db.insert")
        .trace_id(&trace_id)
        .span_id("span-db")
        .parent_span_id(root_span)
        .payload(json!({ "table": "orders", "latency_ms": 12 }))
        .send()?;

    // Downstream HTTP call — child of db span
    client.trace("http.client.notify_warehouse")
        .trace_id(&trace_id)
        .span_id("span-notify")
        .parent_span_id("span-db")
        .payload(json!({
            "url":        "https://warehouse.internal/notify",
            "status":     200,
            "latency_ms": 45,
        }))
        .send()?;

    // ── Metric events ────────────────────────────────────────────────────────

    client.metric("api.request_duration")
        .payload(json!({
            "p50_ms": 45,
            "p95_ms": 120,
            "p99_ms": 340,
            "count":  1024,
        }))
        .send()?;

    client.metric("db.connection_pool")
        .payload(json!({
            "active": 8,
            "idle":   4,
            "max":    20,
        }))
        .send()?;

    // ── Generic event ─────────────────────────────────────────────────────────

    client.event(EventType::Security, Severity::Warn, "suspicious login attempt")
        .payload(json!({
            "ip":              "198.51.100.1",
            "failed_attempts": 5,
            "blocked":         true,
        }))
        .send()?;

    // ── AI agent events ──────────────────────────────────────────────────────
    // Use ai() for all LLM calls, tool executions, workflow steps, and evals.
    // All spans in a workflow share the same trace_id so the console renders
    // them as a single waterfall in the AI Events and Traces views.

    let wf_trace_id = format!("wf-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
    let wf_span_id  = format!("wf-start-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());

    // 1 — workflow_start
    client.ai(Severity::Info, "workflow.start")
        .trace_id(&wf_trace_id)
        .span_id(&wf_span_id)
        .payload(json!({
            "kind":             "workflow_start",
            "workflow_name":    "answer-user-query",
            "workflow_version": "v1.0",
            "trigger":          "user_message",
            "input_summary":    "User asked about pricing plans",
        }))
        .send()?;

    // 2 — retrieval (wiki, vectorless)
    let ret_span_id = format!("ret-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
    client.ai(Severity::Info, "retrieval.completed")
        .trace_id(&wf_trace_id)
        .span_id(&ret_span_id)
        .parent_span_id(&wf_span_id)
        .payload(json!({
            "kind":             "retrieval",
            "retrieval_method": "wiki",
            "source":           "internal-wiki",
            "query_summary":    "pricing plans",
            "chunks_retrieved": 3,
            "top_score":        null,
            "empty_result":     false,
            "latency_ms":       72,
        }))
        .send()?;

    // 3 — llm_call (gpt-4o)
    let llm_span_id = format!("llm-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
    client.ai(Severity::Info, "llm.call.completed")
        .trace_id(&wf_trace_id)
        .span_id(&llm_span_id)
        .parent_span_id(&wf_span_id)
        .payload(json!({
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
        }))
        .send()?;

    // 4 — safety_check (child of llm_call)
    client.ai(Severity::Info, "safety.check")
        .trace_id(&wf_trace_id)
        .span_id("safe-001")
        .parent_span_id(&llm_span_id)
        .payload(json!({
            "kind":           "safety_check",
            "guardrail":      "llama-guard-3",
            "input_flagged":  false,
            "output_flagged": false,
            "action_taken":   "passed",
            "latency_ms":     28,
        }))
        .send()?;

    // 5 — tool_call
    client.ai(Severity::Info, "tool.call.completed")
        .trace_id(&wf_trace_id)
        .span_id("tool-001")
        .parent_span_id(&wf_span_id)
        .payload(json!({
            "kind":           "tool_call",
            "tool_name":      "get_pricing_table",
            "latency_ms":     140,
            "success":        true,
            "output_summary": "Returned 3 pricing tiers",
        }))
        .send()?;

    // 6 — workflow_end
    client.ai(Severity::Info, "workflow.end")
        .trace_id(&wf_trace_id)
        .span_id("wf-end-001")
        .parent_span_id(&wf_span_id)
        .payload(json!({
            "kind":           "workflow_end",
            "workflow_name":  "answer-user-query",
            "duration_ms":    1120,
            "total_tokens":   1240,
            "total_cost_usd": 0.0062,
            "steps_taken":    4,
            "outcome":        "success",
        }))
        .send()?;

    // 7 — standalone eval_result
    client.ai(Severity::Info, "eval.result")
        .payload(json!({
            "kind":      "eval_result",
            "evaluator": "llm-as-judge",
            "metric":    "factual_accuracy",
            "score":     0.87_f64,
            "passed":    true,
        }))
        .send()?;

    println!("AI workflow sent: trace_id={}  6 spans", wf_trace_id);

    // ── Explicit flush ────────────────────────────────────────────────────────
    // In long-running services the background thread handles this.
    // In short-lived programs call flush() before shutdown().
    println!("Flushing events…");
    client.flush()?;

    // Shutdown stops the background thread after a final flush.
    client.shutdown();

    println!("Done — all events sent to Watcher24.");
    Ok(())
}
