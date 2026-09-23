# Observability — OpenTelemetry, Tracing, Metrics, Alerting

---

## OpenTelemetry Integration

```bash
uv add opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-fastapi opentelemetry-instrumentation-sqlalchemy opentelemetry-exporter-otlp
```

```python
# app/core/telemetry.py

from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

def setup_telemetry(app):
    # Tracing
    provider = TracerProvider()
    provider.add_span_processor(BatchSpanProcessor(
        OTLPSpanExporter(endpoint=settings.OTEL_ENDPOINT)
    ))
    trace.set_tracer_provider(provider)

    # Auto-instrument FastAPI + SQLAlchemy
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(enable_commenter=True)
```

---

## Key Metrics to Track

```python
# app/core/metrics.py

from opentelemetry import metrics

meter = metrics.get_meter("fhir-server")

# Request metrics
request_counter = meter.create_counter("fhir.requests.total", description="Total FHIR requests")
request_duration = meter.create_histogram("fhir.request.duration_ms", description="Request latency")
error_counter = meter.create_counter("fhir.errors.total", description="Total errors by type")

# Resource metrics
resource_created = meter.create_counter("fhir.resource.created", description="Resources created")
resource_read = meter.create_counter("fhir.resource.read", description="Resources read")

# Clinical metrics
ai_token_usage = meter.create_counter("fhir.ai.tokens", description="AI tokens consumed")
subscription_deliveries = meter.create_counter("fhir.subscriptions.delivered")
webhook_failures = meter.create_counter("fhir.webhooks.failed")

# Business metrics
active_patients = meter.create_up_down_counter("fhir.patients.active")
active_sessions = meter.create_up_down_counter("fhir.sessions.active")
```

---

## Distributed Tracing

With OpenTelemetry, every request gets a trace ID that flows through:

```
Request → FastAPI router [trace: abc-123]
              → Patient service [span: get_patient]
                  → Patient repository [span: db_query, sql: SELECT...]
                      → PostgreSQL [actual query time]
              → Subscription matcher [span: match_subscriptions]
              → Webhook delivery [span: send_webhook, url: ...]
```

This lets you debug slow requests by seeing exactly which layer is slow.

---

## Health Check Endpoint

```python
@app.get("/health", include_in_schema=False)
async def health_check(session_factory=Depends(get_session_factory)):
    checks = {}

    # Database
    try:
        async with session_factory() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Redis
    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    # AI provider
    checks["ai_provider"] = "ok" if settings.ANTHROPIC_API_KEY else "not configured"

    status = 200 if all(v == "ok" for v in checks.values()) else 503
    return JSONResponse({"status": "healthy" if status == 200 else "degraded", "checks": checks}, status_code=status)

@app.get("/ready", include_in_schema=False)
async def readiness_check():
    """Kubernetes readiness probe — is this instance ready to serve traffic?"""
    return {"ready": True}
```

---

## Alerting Rules

Prometheus alert rules:

```yaml
groups:
  - name: fhir-server
    rules:
      - alert: HighErrorRate
        expr: rate(fhir_errors_total[5m]) > 0.05
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Error rate above 5%"

      - alert: SlowResponses
        expr: histogram_quantile(0.95, rate(fhir_request_duration_ms_bucket[5m])) > 2000
        for: 10m
        labels: { severity: warning }
        annotations:
          summary: "P95 response time above 2 seconds"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels: { severity: critical }

      - alert: HighAITokenUsage
        expr: rate(fhir_ai_tokens_total[1h]) > 10000
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "AI token usage spike"
```

---

## Structured Logging

```python
# app/core/logging.py

import structlog

log = structlog.get_logger()

# In route handlers:
log.info(
    "fhir.resource.created",
    resource_type="Patient",
    resource_id=patient.patient_id,
    user_id=user["sub"],
    org_id=user["activeOrganizationId"],
    duration_ms=elapsed,
)

# In error handlers:
log.error(
    "fhir.request.error",
    path=request.url.path,
    status_code=500,
    error_type=type(exc).__name__,
    error_message=str(exc),
    trace_id=get_trace_id(),
)
```
