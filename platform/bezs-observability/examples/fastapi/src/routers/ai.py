# routers/ai.py — AI agent event examples for the FastAPI example.
#
# Every endpoint fires real events through the Watcher24 Python SDK using the
# new client.ai() method. The events appear immediately in the console under
# the AI Events section (event_type = "ai").
#
# Routes:
#   POST /ai/llm-call   — single mock LLM call (llm_call kind)
#   POST /ai/tool-call  — single mock tool call (tool_call kind)
#   POST /ai/retrieval  — RAG retrieval, vectorless wiki (retrieval kind)
#   POST /ai/workflow   — full agent workflow trace (7 spans, shared trace_id)
#   POST /ai/eval       — attach an evaluation score (eval_result kind)
import random
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from src.watcher import client

router = APIRouter(prefix="/ai", tags=["ai-events"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _mock_llm(model: str = "gpt-4o") -> dict:
    """Return realistic mock LLM usage numbers."""
    prompt_tokens      = random.randint(400, 1200)
    completion_tokens  = random.randint(100, 500)
    total_tokens       = prompt_tokens + completion_tokens
    latency_ms         = random.randint(400, 1800)
    # GPT-4o pricing: $2.50/1M prompt, $10/1M completion
    cost_usd = round(
        (prompt_tokens * 0.0000025) + (completion_tokens * 0.000010), 6
    )
    return {
        "provider":          "openai",
        "model":             model,
        "prompt_tokens":     prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens":      total_tokens,
        "latency_ms":        latency_ms,
        "cost_usd":          cost_usd,
        "finish_reason":     "stop",
        "cached":            False,
    }


# ── Single-event routes ───────────────────────────────────────────────────────

@router.post("/llm-call")
async def mock_llm_call(model: str = "gpt-4o") -> dict:
    """Fire a single llm_call AI event — models a completed LLM API call."""
    trace_id = str(uuid.uuid4())
    span_id  = f"llm-{int(time.time() * 1000)}"
    payload  = {"kind": "llm_call", **_mock_llm(model)}

    client.ai("info", "llm.call.completed",
        trace_id=trace_id, span_id=span_id, payload=payload)

    return {"ok": True, "kind": "llm_call", "trace_id": trace_id,
            "model": model, "payload": payload, "sent_at": _now()}


@router.post("/tool-call")
async def mock_tool_call() -> dict:
    """Fire a tool_call AI event — models an agent calling an external tool."""
    trace_id   = str(uuid.uuid4())
    tool_names = ["web_search", "code_interpreter", "file_reader", "sql_query", "send_email"]
    tool_name  = random.choice(tool_names)
    latency_ms = random.randint(80, 600)
    success    = random.random() > 0.15

    payload = {
        "kind":           "tool_call",
        "tool_name":      tool_name,
        "latency_ms":     latency_ms,
        "success":        success,
        "output_summary": f"Tool returned {random.randint(1, 10)} results" if success else None,
        "error":          "ConnectionError: upstream timeout" if not success else None,
    }

    severity = "info" if success else "error"
    message  = "tool.call.completed" if success else "tool.call.failed"
    client.ai(severity, message, trace_id=trace_id, payload=payload)

    return {"ok": True, "kind": "tool_call", "trace_id": trace_id,
            "tool_name": tool_name, "success": success, "sent_at": _now()}


@router.post("/retrieval")
async def mock_retrieval() -> dict:
    """Fire a retrieval AI event — models a RAG document fetch (wiki method)."""
    trace_id  = str(uuid.uuid4())
    methods   = ["vector", "bm25", "hybrid", "wiki", "sql"]
    method    = random.choice(methods)
    sources   = ["internal-wiki", "product-docs", "vector-db", "postgres", "confluence"]
    source    = random.choice(sources)
    chunks    = random.randint(0, 8)
    empty     = chunks == 0

    payload = {
        "kind":              "retrieval",
        "retrieval_method":  method,
        "source":            source,
        "query_summary":     "user query about product features",
        "chunks_retrieved":  chunks,
        "top_score":         round(random.uniform(0.6, 0.98), 3) if method in ("vector", "hybrid") else None,
        "empty_result":      empty,
        "latency_ms":        random.randint(20, 200),
    }

    client.ai("info", "retrieval.completed", trace_id=trace_id, payload=payload)

    return {"ok": True, "kind": "retrieval", "trace_id": trace_id,
            "method": method, "sent_at": _now()}


@router.post("/eval")
async def mock_eval() -> dict:
    """Fire an eval_result AI event — models an LLM-as-judge quality score."""
    trace_id   = str(uuid.uuid4())
    evaluators = ["llm-as-judge", "rule-based", "human"]
    metrics    = ["factual_accuracy", "relevance", "helpfulness", "safety"]
    evaluator  = random.choice(evaluators)
    metric     = random.choice(metrics)
    score      = round(random.uniform(0.5, 1.0), 3)

    payload = {
        "kind":         "eval_result",
        "evaluator":    evaluator,
        "metric":       metric,
        "score":        score,
        "passed":       score >= 0.75,
        "sample_input": "What is the refund policy?",
        "sample_output": "Our refund policy allows returns within 30 days.",
    }

    client.ai("info", "eval.result", trace_id=trace_id, payload=payload)

    return {"ok": True, "kind": "eval_result", "trace_id": trace_id,
            "metric": metric, "score": score, "sent_at": _now()}


# ── Full workflow route ────────────────────────────────────────────────────────

@router.post("/workflow")
async def mock_workflow() -> dict:
    """
    Fire a complete agent workflow trace — 7 spans sharing one trace_id.

    Span hierarchy:
      workflow_start
        retrieval        (parent: workflow_start)
        llm_call (1)     (parent: workflow_start)
          safety_check   (parent: llm_call 1)
        tool_call        (parent: workflow_start)
        llm_call (2)     (parent: workflow_start)
      workflow_end       (parent: workflow_start)
    """
    trace_id    = str(uuid.uuid4())
    wf_span     = f"wf-{int(time.time() * 1000)}"
    ret_span    = f"ret-{int(time.time() * 1000)+1}"
    llm1_span   = f"llm1-{int(time.time() * 1000)+2}"
    safe_span   = f"safe-{int(time.time() * 1000)+3}"
    tool_span   = f"tool-{int(time.time() * 1000)+4}"
    llm2_span   = f"llm2-{int(time.time() * 1000)+5}"
    wf_end_span = f"wfe-{int(time.time() * 1000)+6}"

    llm1 = _mock_llm("gpt-4o")
    llm2 = _mock_llm("gpt-4o-mini")
    total_tokens   = llm1["total_tokens"] + llm2["total_tokens"]
    total_cost_usd = round(llm1["cost_usd"] + llm2["cost_usd"], 6)
    duration_ms    = llm1["latency_ms"] + llm2["latency_ms"] + random.randint(200, 600)

    # 1 — workflow_start
    client.ai("info", "workflow.start", trace_id=trace_id, span_id=wf_span, payload={
        "kind": "workflow_start",
        "workflow_name": "answer-user-query",
        "workflow_version": "v1.2",
        "trigger": "user_message",
        "input_summary": "User asked about pricing plans",
    })

    # 2 — retrieval (child of workflow_start)
    client.ai("info", "retrieval.completed", trace_id=trace_id, span_id=ret_span,
              parent_span_id=wf_span, payload={
        "kind":              "retrieval",
        "retrieval_method":  "wiki",
        "source":            "internal-wiki",
        "query_summary":     "pricing plans",
        "chunks_retrieved":  3,
        "top_score":         None,
        "empty_result":      False,
        "latency_ms":        random.randint(30, 120),
    })

    # 3 — llm_call 1 (child of workflow_start)
    client.ai("info", "llm.call.completed", trace_id=trace_id, span_id=llm1_span,
              parent_span_id=wf_span, payload={"kind": "llm_call", **llm1})

    # 4 — safety_check (child of llm_call 1)
    flagged = random.random() < 0.1
    client.ai("info", "safety.check", trace_id=trace_id, span_id=safe_span,
              parent_span_id=llm1_span, payload={
        "kind":           "safety_check",
        "guardrail":      "llama-guard-3",
        "input_flagged":  False,
        "output_flagged": flagged,
        "action_taken":   "blocked" if flagged else "passed",
        "latency_ms":     random.randint(15, 60),
    })

    # 5 — tool_call (child of workflow_start)
    client.ai("info", "tool.call.completed", trace_id=trace_id, span_id=tool_span,
              parent_span_id=wf_span, payload={
        "kind":           "tool_call",
        "tool_name":      "get_pricing_table",
        "latency_ms":     random.randint(40, 200),
        "success":        True,
        "output_summary": "Returned 3 pricing tiers",
    })

    # 6 — llm_call 2 (child of workflow_start)
    client.ai("info", "llm.call.completed", trace_id=trace_id, span_id=llm2_span,
              parent_span_id=wf_span, payload={"kind": "llm_call", **llm2})

    # 7 — workflow_end (child of workflow_start)
    client.ai("info", "workflow.end", trace_id=trace_id, span_id=wf_end_span,
              parent_span_id=wf_span, payload={
        "kind":            "workflow_end",
        "workflow_name":   "answer-user-query",
        "duration_ms":     duration_ms,
        "total_tokens":    total_tokens,
        "total_cost_usd":  total_cost_usd,
        "steps_taken":     5,
        "outcome":         "success",
    })

    return {
        "ok":             True,
        "trace_id":       trace_id,
        "spans":          7,
        "total_tokens":   total_tokens,
        "total_cost_usd": total_cost_usd,
        "duration_ms":    duration_ms,
        "sent_at":        _now(),
    }
