# routers/test.py — SDK Test Lab for the FastAPI example.
#
# Exposes:
#   GET  /test          — Interactive HTML page with buttons to fire all event types.
#   POST /test/audit    — Fire an audit event.
#   POST /test/log      — Fire a log event at any severity.
#   POST /test/trace    — Fire a trace/span event.
#   POST /test/metric   — Fire a metric event.
#
# The HTML page uses vanilla JS fetch to call the POST endpoints and renders
# an event log, mirroring the Test Lab in the Next.js and React+Node examples.
# This is server-side only — FastAPI has no browser SDK.
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from src.watcher import client

router = APIRouter(prefix="/test", tags=["test-lab"])


# ── Request bodies ─────────────────────────────────────────────────────────────

class AuditBody(BaseModel):
    event_type: str = "test.server.user.action"

class LogBody(BaseModel):
    severity: str = "info"
    event_type: str = "test.server.log.info"

class TraceBody(BaseModel):
    event_type: str = "test.server.db.query"

class MetricBody(BaseModel):
    event_type: str = "test.server.request.count"
    value: float = 1.0


# ── Event endpoints ────────────────────────────────────────────────────────────

@router.post("/audit")
async def fire_audit(body: AuditBody) -> dict:
    """Fire an audit event through the Watcher24 Python SDK."""
    client.audit(body.event_type, user_id="test-user", payload={"source": "test-lab"})
    return {"ok": True, "type": "audit", "event_type": body.event_type, "sent_at": _now()}


@router.post("/log")
async def fire_log(body: LogBody) -> dict:
    """Fire a log event at the requested severity."""
    client.log(body.severity, body.event_type, payload={"source": "test-lab"})
    return {"ok": True, "type": "log", "event_type": body.event_type, "severity": body.severity, "sent_at": _now()}


@router.post("/trace")
async def fire_trace(body: TraceBody) -> dict:
    """Fire a trace span event with a fresh trace ID."""
    trace_id = str(uuid.uuid4())
    span_id  = str(uuid.uuid4())
    client.trace(body.event_type, trace_id=trace_id, span_id=span_id, payload={"source": "test-lab"})
    return {"ok": True, "type": "trace", "event_type": body.event_type, "sent_at": _now()}


@router.post("/metric")
async def fire_metric(body: MetricBody) -> dict:
    """Fire a metric event with an explicit numeric value."""
    client.metric(body.event_type, payload={"value": body.value, "source": "test-lab"})
    return {"ok": True, "type": "metric", "event_type": body.event_type, "sent_at": _now()}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Interactive HTML page ──────────────────────────────────────────────────────

@router.get("", response_class=HTMLResponse)
async def test_lab_page() -> str:
    """Serve the interactive SDK Test Lab HTML page."""
    return _HTML


_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SDK Test Lab — Watcher24 FastAPI</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px 24px; background: #f9fafb; color: #111; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .subtitle { color: #6b7280; font-size: 13px; margin: 0 0 28px; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 20px; max-width: 520px; margin: 0 auto; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 16px; }
  .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .card-header h2 { margin: 0; font-size: 14px; }
  .card-header p { margin: 0; font-size: 11px; color: #6b7280; }
  .section-label { margin: 14px 0 7px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #9ca3af; }
  .btn { display: block; width: 100%; padding: 7px 10px; margin-bottom: 5px; font-size: 11px; font-family: 'Menlo','Monaco',monospace; text-align: left; border-radius: 6px; border: 1px solid; background: none; cursor: pointer; }
  .btn:disabled { background: #f9fafb !important; color: #9ca3af !important; border-color: #e5e7eb !important; cursor: not-allowed; }
  .btn-audit  { color:#1d4ed8; background:#eff6ff; border-color:#bfdbfe; }
  .btn-log-debug { color:#4b5563; background:#f9fafb; border-color:#e5e7eb; }
  .btn-log-info  { color:#1d4ed8; background:#eff6ff; border-color:#bfdbfe; }
  .btn-log-warn  { color:#92400e; background:#fffbeb; border-color:#fde68a; }
  .btn-log-error { color:#991b1b; background:#fef2f2; border-color:#fecaca; }
  .btn-trace  { color:#6d28d9; background:#f5f3ff; border-color:#ddd6fe; }
  .btn-metric { color:#15803d; background:#f0fdf4; border-color:#bbf7d0; }
  .btn-ai     { color:#7c3aed; background:#f5f3ff; border-color:#ddd6fe; }
  .btn-ai-wf  { color:#5b21b6; background:#ede9fe; border-color:#c4b5fd; font-weight:600; }
  .chip-ai    { background:#f5f3ff; color:#7c3aed; border-color:#ddd6fe; }
  .log-panel { margin-top: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; max-width: 520px; margin-left: auto; margin-right: auto; }
  .log-header { padding: 10px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; }
  .log-header span { font-size: 13px; font-weight: 600; }
  .log-header button { font-size: 11px; color: #9ca3af; background: none; border: none; cursor: pointer; }
  .log-body { max-height: 280px; overflow-y: auto; }
  .log-empty { text-align: center; color: #9ca3af; font-size: 13px; padding: 32px 0; }
  .log-row { display: flex; align-items: center; gap: 7px; padding: 8px 16px; border-bottom: 1px solid #f3f4f6; }
  .chip { padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; border: 1px solid; flex-shrink: 0; }
  .chip-audit  { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
  .chip-log    { background:#ecfeff; color:#0e7490; border-color:#a5f3fc; }
  .chip-trace  { background:#f5f3ff; color:#6d28d9; border-color:#ddd6fe; }
  .chip-metric { background:#f0fdf4; color:#15803d; border-color:#bbf7d0; }
  .chip-debug { background:#f9fafb; color:#4b5563; border-color:#e5e7eb; }
  .chip-info  { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
  .chip-warn  { background:#fffbeb; color:#92400e; border-color:#fde68a; }
  .chip-error { background:#fef2f2; color:#991b1b; border-color:#fecaca; }
  .log-event-type { flex: 1; font-size: 11px; color: #374151; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .log-time { font-size: 10px; color: #9ca3af; flex-shrink: 0; }
</style>
</head>
<body>
<div style="max-width:520px;margin:0 auto">
  <h1>SDK Test Lab</h1>
  <p class="subtitle">Watcher24 FastAPI example &mdash; server-side only &mdash; check your dashboard to see events arrive.</p>

  <div class="grid">
    <div class="card">
      <div class="card-header">
        <span style="font-size:20px">⚙️</span>
        <div><h2>Server-side</h2><p>client.audit · .log · .trace · .metric</p></div>
      </div>

      <p class="section-label">Audit Events</p>
      <button class="btn btn-audit" onclick="fire('/test/audit',{event_type:'test.server.user.action'},'audit')">audit&nbsp;&nbsp;test.server.user.action</button>
      <button class="btn btn-audit" onclick="fire('/test/audit',{event_type:'test.server.data.accessed'},'audit')">audit&nbsp;&nbsp;test.server.data.accessed</button>
      <button class="btn btn-audit" onclick="fire('/test/audit',{event_type:'test.server.auth.attempt'},'audit')">audit&nbsp;&nbsp;test.server.auth.attempt</button>

      <p class="section-label">Log Events</p>
      <button class="btn btn-log-debug" onclick="fire('/test/log',{severity:'debug',event_type:'test.server.log.debug'},'log','debug')">log&nbsp;&nbsp;debug</button>
      <button class="btn btn-log-info"  onclick="fire('/test/log',{severity:'info', event_type:'test.server.log.info'}, 'log','info')">log&nbsp;&nbsp;info</button>
      <button class="btn btn-log-warn"  onclick="fire('/test/log',{severity:'warn', event_type:'test.server.log.warn'}, 'log','warn')">log&nbsp;&nbsp;warn</button>
      <button class="btn btn-log-error" onclick="fire('/test/log',{severity:'error',event_type:'test.server.log.error'},'log','error')">log&nbsp;&nbsp;error</button>

      <p class="section-label">Trace Events</p>
      <button class="btn btn-trace" onclick="fire('/test/trace',{event_type:'test.server.db.query'},'trace')">trace&nbsp;&nbsp;test.server.db.query</button>
      <button class="btn btn-trace" onclick="fire('/test/trace',{event_type:'test.server.outbound.http'},'trace')">trace&nbsp;&nbsp;test.server.outbound.http</button>

      <p class="section-label">Metric Events</p>
      <button class="btn btn-metric" onclick="fire('/test/metric',{event_type:'test.server.request.count',value:1},'metric')">metric&nbsp;&nbsp;test.server.request.count</button>
      <button class="btn btn-metric" onclick="fire('/test/metric',{event_type:'test.server.response.time.ms',value:Math.round(Math.random()*500)},'metric')">metric&nbsp;&nbsp;test.server.response.time.ms</button>
    </div>

    <div class="card" style="border-color:#ddd6fe">
      <div class="card-header">
        <span style="font-size:20px">🤖</span>
        <div><h2>AI Agent Events</h2><p>client.ai() — event_type: "ai" — server-side only</p></div>
      </div>

      <p class="section-label">Single Events</p>
      <button class="btn btn-ai" onclick="fireAI('/ai/llm-call','llm_call','LLM call (gpt-4o)')">ai&nbsp;&nbsp;llm_call — single LLM API call</button>
      <button class="btn btn-ai" onclick="fireAI('/ai/tool-call','tool_call','Tool call (random)')">ai&nbsp;&nbsp;tool_call — agent calls external tool</button>
      <button class="btn btn-ai" onclick="fireAI('/ai/retrieval','retrieval','RAG retrieval (random method)')">ai&nbsp;&nbsp;retrieval — RAG document fetch</button>
      <button class="btn btn-ai" onclick="fireAI('/ai/eval','eval_result','Eval score')">ai&nbsp;&nbsp;eval_result — LLM-as-judge quality score</button>

      <p class="section-label">Full Workflow (7 spans, 1 trace)</p>
      <button class="btn btn-ai-wf" onclick="fireWorkflow()">ai&nbsp;&nbsp;workflow — start → retrieval → llm → safety → tool → llm → end</button>
    </div>
  </div>

  <div class="log-panel">
    <div class="log-header">
      <span id="log-title">Event Log</span>
      <button onclick="clearLog()">Clear</button>
    </div>
    <div class="log-body" id="log-body">
      <p class="log-empty">No events fired yet — click a button above.</p>
    </div>
  </div>
</div>

<script>
const entries = [];

async function fire(path, body, kind, severity) {
  const btn = event.currentTarget;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ sending…';
  try {
    const res = await fetch(path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    push({ kind, eventType: data.event_type, severity, sentAt: data.sent_at });
  } catch(e) {
    push({ kind, eventType: body.event_type, severity, sentAt: new Date().toISOString() });
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

async function fireAI(path, aiKind, label) {
  const btn = event.currentTarget;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ sending…';
  try {
    const res = await fetch(path, { method: 'POST' });
    const data = await res.json();
    push({ kind: 'ai', eventType: `ai.${aiKind}`, aiKind, sentAt: data.sent_at || new Date().toISOString() });
  } catch(e) {
    push({ kind: 'ai', eventType: `ai.${aiKind}`, aiKind, sentAt: new Date().toISOString() });
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

async function fireWorkflow() {
  const btn = event.currentTarget;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ sending 7 spans…';
  try {
    const res = await fetch('/ai/workflow', { method: 'POST' });
    const data = await res.json();
    push({ kind: 'ai', eventType: `workflow (${data.spans} spans, trace: ${data.trace_id?.slice(0,8)}…)`, aiKind: 'workflow', sentAt: data.sent_at || new Date().toISOString() });
  } catch(e) {
    push({ kind: 'ai', eventType: 'workflow (7 spans)', aiKind: 'workflow', sentAt: new Date().toISOString() });
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

function push(entry) {
  entry.id = Math.random().toString(36).slice(2);
  entries.unshift(entry);
  if (entries.length > 50) entries.pop();
  render();
}

function clearLog() { entries.length = 0; render(); }

function chip(label, cls) {
  return `<span class="chip ${cls}">${label}</span>`;
}

function render() {
  const title = document.getElementById('log-title');
  const body = document.getElementById('log-body');
  title.textContent = entries.length > 0 ? `Event Log — ${entries.length} fired this session` : 'Event Log';
  if (entries.length === 0) {
    body.innerHTML = '<p class="log-empty">No events fired yet — click a button above.</p>';
    return;
  }
  body.innerHTML = entries.map(e => `
    <div class="log-row">
      ${chip(e.kind, 'chip-' + e.kind)}
      ${e.aiKind ? chip(e.aiKind.replace(/_/g,' '), 'chip-ai') : ''}
      ${e.severity ? chip(e.severity, 'chip-' + e.severity) : ''}
      <span class="log-event-type">${e.eventType}</span>
      <span class="log-time">${new Date(e.sentAt).toLocaleTimeString()}</span>
    </div>
  `).join('');
}
</script>
</body>
</html>
"""
