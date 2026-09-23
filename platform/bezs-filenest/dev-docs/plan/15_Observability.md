# FileNest v1.0 — Observability

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Observability Philosophy](#1-observability-philosophy)
2. [OpenTelemetry Architecture](#2-opentelemetry-architecture)
3. [Structured Logging](#3-structured-logging)
4. [Distributed Tracing](#4-distributed-tracing)
5. [Metrics](#5-metrics)
6. [Alerting](#6-alerting)
7. [Dashboards](#7-dashboards)
8. [SLIs, SLOs, and Error Budgets](#8-slis-slos-and-error-budgets)
9. [Log Aggregation Pipeline](#9-log-aggregation-pipeline)
10. [Incident Response](#10-incident-response)

---

## 1. Observability Philosophy

### 1.1 Three Pillars

| Pillar | Tool | Purpose |
|--------|------|---------|
| **Logs** | structlog → Loki | Timestamped events, audit trail, debug detail |
| **Metrics** | Prometheus + custom | Aggregated counters/histograms, alerting |
| **Traces** | OpenTelemetry → Tempo | Request flow across services, latency attribution |

**Principle**: Every user-facing operation emits all three. A failed upload can be diagnosed entirely from telemetry — no SSH required.

---

## 2. OpenTelemetry Architecture

### 2.1 SDK Initialization

```python
# backend/app/core/telemetry.py
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

def init_telemetry(service_name: str, settings: Settings) -> None:
    resource = Resource.create({
        "service.name": service_name,
        "service.version": settings.app_version,
        "deployment.environment": settings.environment,
        "k8s.pod.name": settings.pod_name,
    })

    exporter = OTLPSpanExporter(
        endpoint=settings.otel_endpoint,
        insecure=True,
    )

    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Auto-instrument everything
    FastAPIInstrumentor.instrument()
    SQLAlchemyInstrumentor.instrument()
    RedisInstrumentor.instrument()
    HTTPXClientInstrumentor.instrument()

def get_tracer(name: str) -> trace.Tracer:
    return trace.get_tracer(name)
```

### 2.2 OTel Collector Configuration

```yaml
# helm/templates/otel-collector/configmap.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
  resource:
    attributes:
      - key: cluster.name
        value: filenest-production
        action: insert
  filter:
    traces:
      span:
        - 'attributes["http.route"] == "/health/live"'   # Drop health check spans

exporters:
  otlp/tempo:
    endpoint: http://tempo.filenest-monitoring:4317
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889
  loki:
    endpoint: http://loki.filenest-monitoring:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, filter, resource]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

---

## 3. Structured Logging

### 3.1 Logger Setup

```python
# backend/app/core/logging.py
import structlog

def configure_logging(service_name: str, environment: str) -> None:
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.StackInfoRenderer(),
    ]

    if environment == "production":
        processors = shared_processors + [structlog.processors.JSONRenderer()]
        formatter = structlog.stdlib.ProcessorFormatter(
            processors=processors,
        )
    else:
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]
        formatter = structlog.stdlib.ProcessorFormatter(
            processors=processors,
        )

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

logger = structlog.get_logger()
```

### 3.2 Request Context Binding

```python
# backend/app/main.py (RequestIDMiddleware)
import uuid
from opentelemetry import trace

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        span = trace.get_current_span()
        trace_id = format(span.get_span_context().trace_id, "032x")

        # Bind to structlog context for all log lines in this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
        )

        start = time.monotonic()
        response = await call_next(request)
        duration_ms = int((time.monotonic() - start) * 1000)

        logger.info(
            "http_request",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        response.headers["X-Request-Id"] = request_id
        return response
```

### 3.3 Standard Log Fields

Every log line produced by FileNest services emits these fields:

```json
{
  "timestamp": "2026-06-15T10:30:00.123Z",
  "level": "info",
  "service": "file-service",
  "environment": "production",
  "request_id": "req_abc123",
  "trace_id": "d4cda95b652f4a1592544c1d4cc0b6ef",
  "org_id": "org_01j...",
  "project_id": "proj_01j...",
  "user_id": "usr_01j...",
  "event": "file_upload_completed",
  "file_id": "file_01j...",
  "file_size": 1048576,
  "duration_ms": 234,
  "pod_name": "file-service-7d4f8-abc12"
}
```

### 3.4 Audit Log Events

```python
# backend/app/services/audit.py
class AuditLogger:
    async def log(
        self,
        *,
        action: str,
        actor_id: str,
        actor_type: Literal["user", "api_key", "service_account", "system"],
        resource_type: str,
        resource_id: str,
        org_id: str,
        project_id: str,
        result: Literal["success", "failure", "denied"],
        metadata: dict | None = None,
        db: AsyncSession,
    ) -> None:
        await db.execute(
            insert(AuditLog).values(
                id=new_id("auditlog"),
                action=action,
                actor_id=actor_id,
                actor_type=actor_type,
                resource_type=resource_type,
                resource_id=resource_id,
                org_id=org_id,
                project_id=project_id,
                result=result,
                metadata=metadata or {},
                occurred_at=datetime.utcnow(),
            )
        )

        # Also emit to structlog (goes to Loki)
        structlog.get_logger().info(
            "audit_event",
            action=action,
            actor_id=actor_id,
            resource_type=resource_type,
            resource_id=resource_id,
            result=result,
        )
```

---

## 4. Distributed Tracing

### 4.1 Manual Span Instrumentation

```python
# Wrapping critical business operations with spans
tracer = get_tracer("file-service")

async def complete_upload(
    upload_session_id: str,
    db: AsyncSession,
    storage: StorageProvider,
) -> File:
    with tracer.start_as_current_span("complete_upload") as span:
        span.set_attribute("upload_session_id", upload_session_id)

        with tracer.start_as_current_span("validate_parts"):
            session = await validate_upload_session(upload_session_id, db)
            span.set_attribute("file.size", session.total_size)
            span.set_attribute("file.mime_type", session.mime_type)

        with tracer.start_as_current_span("complete_multipart_upload"):
            await storage.complete_multipart_upload(
                session.storage_key, session.upload_id, session.parts
            )

        with tracer.start_as_current_span("create_file_record"):
            file = await create_file_from_session(session, db)

        with tracer.start_as_current_span("publish_event"):
            await publish_file_uploaded_event(file, db)

        span.set_attribute("file.id", file.id)
        return file
```

### 4.2 Cross-Service Propagation

```python
# Context is automatically propagated by OTel instrumentation
# Manual propagation for NATS messages:

from opentelemetry.propagate import inject, extract

async def publish_event(event: BaseEvent, nc: nats.NATS) -> None:
    headers = {}
    inject(headers)  # Injects traceparent header

    await nc.publish(
        subject=event.subject,
        payload=event.model_dump_json().encode(),
        headers=headers,
    )

async def consume_event(msg: nats.Msg) -> None:
    # Extract trace context from incoming message headers
    ctx = extract(msg.headers or {})
    with tracer.start_as_current_span("process_event", context=ctx) as span:
        event = parse_event(msg.data)
        span.set_attribute("event.type", event.event_type)
        # ... process event
```

---

## 5. Metrics

### 5.1 Application Metrics

```python
# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# HTTP metrics (auto-generated by FastAPI instrumentation)
# Manual business metrics:

FILES_UPLOADED = Counter(
    "filenest_files_uploaded_total",
    "Total files uploaded",
    ["org_id", "project_id", "mime_type_category"],
)

FILES_UPLOAD_BYTES = Counter(
    "filenest_files_upload_bytes_total",
    "Total bytes uploaded",
    ["org_id", "project_id"],
)

UPLOAD_DURATION = Histogram(
    "filenest_upload_duration_seconds",
    "Upload operation duration",
    ["stage"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

PROCESSING_JOB_DURATION = Histogram(
    "filenest_processing_job_duration_seconds",
    "Processing pipeline duration",
    ["stage", "status"],
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0],
)

PROCESSING_QUEUE_DEPTH = Gauge(
    "filenest_processing_queue_depth",
    "NATS JetStream consumer lag for processing",
)

ACTIVE_UPLOAD_SESSIONS = Gauge(
    "filenest_active_upload_sessions",
    "Number of in-progress upload sessions",
    ["org_id"],
)

VIRUS_DETECTED = Counter(
    "filenest_virus_detections_total",
    "Files flagged by virus scanner",
    ["threat_name"],
)

PHI_DETECTIONS = Counter(
    "filenest_phi_detections_total",
    "Files where PHI was detected",
    ["org_id", "action"],
)

SEARCH_QUERY_DURATION = Histogram(
    "filenest_search_query_duration_seconds",
    "Search query latency",
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)

WEBHOOK_DELIVERIES = Counter(
    "filenest_webhook_deliveries_total",
    "Webhook delivery attempts",
    ["status"],  # success | failed | retrying
)

API_KEY_AUTH_FAILURES = Counter(
    "filenest_api_key_auth_failures_total",
    "Authentication failures",
    ["reason"],  # invalid_key | expired | revoked | ip_blocked
)

STORAGE_OPERATION_DURATION = Histogram(
    "filenest_storage_operation_duration_seconds",
    "Storage provider operation latency",
    ["provider", "operation"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

DB_CONNECTION_POOL_UTILIZATION = Gauge(
    "filenest_db_pool_utilization",
    "Database connection pool utilization",
    ["pool_type"],  # primary | replica
)
```

### 5.2 Prometheus Scrape Config

```yaml
# prometheus/config/prometheus.yml
scrape_configs:
  - job_name: filenest-services
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: [filenest-prod]
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: ${__meta_kubernetes_pod_ip}:${1}

  - job_name: nats
    static_configs:
      - targets: ["nats.filenest-data:7777"]

  - job_name: postgres-exporter
    static_configs:
      - targets: ["postgres-exporter.filenest-data:9187"]

  - job_name: redis-exporter
    static_configs:
      - targets: ["redis-exporter.filenest-data:9121"]

  - job_name: keda-metrics
    static_configs:
      - targets: ["keda-metrics-apiserver.keda:9022"]
```

---

## 6. Alerting

### 6.1 Critical Alerts (PagerDuty — immediate)

```yaml
# prometheus/rules/filenest-critical.yml
groups:
  - name: filenest.critical
    rules:
      - alert: APIGatewayDown
        expr: up{job="filenest-services", app="api-gateway"} == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "API Gateway is down"
          runbook: "https://runbooks.filenest.io/api-gateway-down"

      - alert: HighErrorRate
        expr: |
          rate(http_server_requests_total{status=~"5.."}[5m])
          /
          rate(http_server_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 5% for 5 minutes"
          dashboard: "https://grafana.filenest.io/d/api-overview"

      - alert: DatabaseConnectionExhausted
        expr: filenest_db_pool_utilization{pool_type="primary"} > 0.95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "DB connection pool is >95% utilized"

      - alert: VirusScanUnavailable
        expr: up{job="clamav"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClamAV is unavailable — uploads are being blocked"

      - alert: NATSConsumerLagCritical
        expr: keda_nats_jetstream_consumer_lag{consumer="processing-workers"} > 500
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Processing backlog >500 jobs"
```

### 6.2 Warning Alerts (Slack)

```yaml
  - name: filenest.warning
    rules:
      - alert: HighP95Latency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P95 API latency above 2s"

      - alert: SearchQueryLatencyHigh
        expr: histogram_quantile(0.95, rate(filenest_search_query_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning

      - alert: WebhookDeliveryFailureRate
        expr: |
          rate(filenest_webhook_deliveries_total{status="failed"}[15m])
          /
          rate(filenest_webhook_deliveries_total[15m]) > 0.1
        for: 10m
        labels:
          severity: warning

      - alert: StorageOperationSlowdown
        expr: histogram_quantile(0.95, rate(filenest_storage_operation_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
          annotations:
            summary: "Storage operations P95 >5s"

      - alert: PHIDetectionSpike
        expr: rate(filenest_phi_detections_total[1h]) > 100
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Unusually high PHI detection rate — possible data leak"
```

### 6.3 Alertmanager Routing

```yaml
# alertmanager/config/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: [alertname, severity]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: slack-warnings

  routes:
    - match:
        severity: critical
      receiver: pagerduty-critical
      continue: true
    - match:
        severity: critical
      receiver: slack-critical

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - service_key: "${PAGERDUTY_KEY}"
        description: "{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}"

  - name: slack-critical
    slack_configs:
      - api_url: "${SLACK_WEBHOOK_CRITICAL}"
        channel: "#incidents"
        title: ":fire: CRITICAL: {{ .GroupLabels.alertname }}"
        text: "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"

  - name: slack-warnings
    slack_configs:
      - api_url: "${SLACK_WEBHOOK_WARNINGS}"
        channel: "#platform-alerts"
```

---

## 7. Dashboards

### 7.1 Grafana Dashboard: API Overview

```json
{
  "title": "FileNest — API Overview",
  "panels": [
    {
      "title": "Request Rate",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(http_server_requests_total[5m])) by (route)",
          "legendFormat": "{{ route }}"
        }
      ]
    },
    {
      "title": "Error Rate (%)",
      "type": "timeseries",
      "targets": [
        {
          "expr": "100 * rate(http_server_requests_total{status=~'5..'}[5m]) / rate(http_server_requests_total[5m])",
          "legendFormat": "5xx Rate"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              { "color": "green", "value": 0 },
              { "color": "yellow", "value": 1 },
              { "color": "red", "value": 5 }
            ]
          }
        }
      }
    },
    {
      "title": "P50 / P95 / P99 Latency",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "P50"
        },
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "P95"
        },
        {
          "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "P99"
        }
      ]
    },
    {
      "title": "Active Upload Sessions",
      "type": "stat",
      "targets": [
        { "expr": "sum(filenest_active_upload_sessions)" }
      ]
    },
    {
      "title": "Files Uploaded (last 24h)",
      "type": "stat",
      "targets": [
        { "expr": "sum(increase(filenest_files_uploaded_total[24h]))" }
      ]
    },
    {
      "title": "Processing Queue Depth",
      "type": "timeseries",
      "targets": [
        {
          "expr": "filenest_processing_queue_depth",
          "legendFormat": "NATS Lag"
        }
      ]
    }
  ]
}
```

### 7.2 Dashboard: Processing Pipeline Health

```
Panels:
─────────────────────────────────────────────────────────────
│ Processing Job Duration P95 (by stage)                     │
│ - virus_scan, ocr, phi_detection, classification, indexing │
├─────────────────────────────────────────────────────────────┤
│ Stage Success Rate (24h rolling)                           │
│ = success / (success + failed) by stage                    │
├─────────────────────────────────────────────────────────────┤
│ Virus Detections (by threat name, last 7d)                 │
├─────────────────────────────────────────────────────────────┤
│ PHI Detections Rate (per hour)                             │
├─────────────────────────────────────────────────────────────┤
│ DLQ Message Count (dead letters)                           │
├─────────────────────────────────────────────────────────────┤
│ Active Worker Pods vs Queue Depth (correlation)            │
─────────────────────────────────────────────────────────────
```

---

## 8. SLIs, SLOs, and Error Budgets

### 8.1 SLI Definitions

```
SLI 1: API Availability
  Measurement: Fraction of minutes in which API returned non-5xx responses
  Formula: successful_requests / total_requests
  Exclusions: 400/401/403/404 (client errors don't count against SLI)

SLI 2: Upload Latency
  Measurement: Fraction of uploads completing in < 5s (for files < 10MB)
  Formula: uploads_under_5s / total_uploads
  Exclusions: Files > 10MB (separate SLI for large uploads)

SLI 3: Download Latency (signed URL generation)
  Measurement: Fraction of signed URL requests completing < 200ms
  Formula: url_requests_under_200ms / total_url_requests

SLI 4: Search Query Latency
  Measurement: Fraction of search queries completing < 500ms
  Formula: searches_under_500ms / total_searches

SLI 5: Processing Completion Rate
  Measurement: Fraction of uploaded files fully processed within 5 minutes
  Formula: files_processed_in_5m / files_uploaded
  Exclusions: Files uploaded during maintenance windows
```

### 8.2 SLO Targets

| SLO | Target | Window | Burn Rate Alert |
|-----|--------|--------|-----------------|
| API Availability | 99.9% | 30 days | 14× for 1h, 6× for 6h |
| Upload Latency P95 < 5s | 99.5% | 30 days | 10× for 1h |
| Download URL Latency P99 < 200ms | 99.5% | 30 days | 10× for 1h |
| Search Latency P95 < 500ms | 99% | 30 days | 8× for 1h |
| Processing Completion Rate | 99% | 7 days | 5× for 1h |

### 8.3 Error Budget Tracking

```python
# Error budget remaining calculation
# Budget = (1 - SLO target) × window in minutes

def calculate_error_budget(
    slo_target: float,  # e.g. 0.999
    window_minutes: int,  # e.g. 30 * 24 * 60 = 43200
    error_minutes: int,   # Minutes where SLI was violated
) -> dict:
    total_budget = (1 - slo_target) * window_minutes
    remaining = total_budget - error_minutes
    pct_remaining = (remaining / total_budget) * 100

    return {
        "total_budget_minutes": total_budget,
        "consumed_minutes": error_minutes,
        "remaining_minutes": max(remaining, 0),
        "percent_remaining": max(pct_remaining, 0),
        "status": "healthy" if pct_remaining > 50 else
                  "warning" if pct_remaining > 10 else "critical",
    }
```

### 8.4 Multi-Window Burn Rate Alerts

```yaml
# Burn rate: how fast are we consuming error budget?
# Alert when 2% of budget consumed in 1 hour = 14× burn rate
groups:
  - name: slo.burn_rates
    rules:
      - alert: ErrorBudgetBurnRateCritical
        expr: |
          (
            rate(http_server_requests_total{status=~"5.."}[1h])
            /
            rate(http_server_requests_total[1h])
          ) > (14 * 0.001)    # 14x burn rate of 0.1% SLO
        for: 2m
        labels:
          severity: critical
          slo: api_availability

      - alert: ErrorBudgetBurnRateHigh
        expr: |
          (
            rate(http_server_requests_total{status=~"5.."}[6h])
            /
            rate(http_server_requests_total[6h])
          ) > (6 * 0.001)     # 6x burn rate over 6h
        for: 15m
        labels:
          severity: warning
          slo: api_availability
```

### 8.5 Error Budget Policy

```
Error Budget Policy — FileNest v1.0

If error budget remaining > 50%:
  → Normal development velocity
  → Can merge risky PRs with appropriate testing

If error budget remaining 10%-50%:
  → Increase testing requirements
  → No risky schema migrations without review
  → Deploy during low-traffic windows only

If error budget remaining < 10%:
  → FREEZE all non-critical deployments
  → Focus entirely on reliability improvements
  → Incident review required before any deploy
  → Engineering leadership notified

If error budget exhausted (0%):
  → No new features shipped until next window
  → SRE-led postmortem mandatory
  → 2-week reliability sprint
```

---

## 9. Log Aggregation Pipeline

### 9.1 Loki Stack

```yaml
# promtail reads logs from pod stdout → Loki
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: filenest-monitoring
spec:
  template:
    spec:
      containers:
        - name: promtail
          image: grafana/promtail:2.9.0
          args:
            - -config.file=/etc/promtail/config.yml
          volumeMounts:
            - name: logs
              mountPath: /var/log/pods
              readOnly: true
      volumes:
        - name: logs
          hostPath:
            path: /var/log/pods
```

### 9.2 Log Query Examples

```logql
# All 5xx errors in the last hour
{namespace="filenest-prod"} | json | status_code >= 500

# Failed uploads for a specific org
{namespace="filenest-prod", app="file-service"}
  | json
  | event = "upload_failed"
  | org_id = "org_01j..."

# Slow requests (> 2 seconds)
{namespace="filenest-prod"}
  | json
  | duration_ms > 2000

# PHI detections in last 24h
{namespace="filenest-prod", app="processing-workers"}
  | json
  | event = "audit_event"
  | action = "phi_detected"
```

---

## 10. Incident Response

### 10.1 On-Call Rotation

```
Primary on-call: 1-week rotation, 2-person coverage
Escalation: 5 min → secondary on-call, 15 min → Engineering Manager

On-call tooling:
  - PagerDuty for alerting
  - Slack #incidents for coordination
  - Grafana for dashboards
  - Runbooks at runbooks.filenest.io
```

### 10.2 Standard Runbooks

**Runbook: High Error Rate**
```
1. Check Grafana API Overview dashboard
2. Identify which route/service is erroring
   → query: sum(rate(http_server_requests_total{status=~"5.."}[5m])) by (route)
3. Check recent deployments
   → kubectl rollout history deployment --namespace filenest-prod
4. If new deploy: rollback
   → helm rollback filenest --namespace filenest-prod
5. Check DB connectivity
   → kubectl exec -n filenest-prod deploy/api-gateway -- python -c "..."
6. Check NATS connectivity
   → nats pub test "hello" --server nats://nats.filenest-data:4222
```

**Runbook: Processing Backlog**
```
1. Check NATS consumer lag
   → nats consumer info FILENEST_EVENTS processing-workers
2. Check worker pod count and CPU
   → kubectl top pods -n filenest-prod -l app=processing-workers
3. If lag > 1000 and workers at max scale:
   → temporarily increase KEDA maxReplicaCount
   → kubectl patch scaledobject processing-workers-scaler ...
4. Check for stuck jobs
   → SELECT * FROM processing_jobs WHERE status='running' AND started_at < NOW()-INTERVAL '30 minutes'
5. If ClamAV down: virus scan stage blocking entire pipeline
   → kubectl rollout restart deployment/clamav -n filenest-data
```

### 10.3 Postmortem Template

```markdown
## Incident Postmortem — [Date] — [Incident Name]

**Severity**: P1/P2/P3
**Duration**: HH:MM
**SLO Impact**: X minutes of error budget consumed

### Timeline
- HH:MM — Alert fired
- HH:MM — On-call acknowledged
- HH:MM — Root cause identified
- HH:MM — Mitigation applied
- HH:MM — Incident resolved

### Root Cause
[Concise explanation]

### Contributing Factors
- [Factor 1]
- [Factor 2]

### What Went Well
- [Item 1]

### What Could Be Improved
- [Item 1]

### Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| [Fix] | @person | YYYY-MM-DD |
```
