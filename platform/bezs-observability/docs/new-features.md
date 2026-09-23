# Watcher24 — New Feature Opportunities

This document catalogues features that are **not yet implemented or planned** in the existing documentation (`console-plan.md`, `implementation-guide.md`, `error-tracing-auto-instrumentation.md`, `public-token-browser-sdk.md`, `multi-app-implementation.md`). Each feature is evaluated against competitors (Datadog, Grafana, Sentry, Elastic, New Relic) and the current Watcher24 architecture.

---

## Table of Contents

1. [Dashboard & Visualisation](#1-dashboard--visualisation)
2. [Log Management](#2-log-management)
3. [APM — Application Performance Monitoring](#3-apm--application-performance-monitoring)
4. [RUM — Real User Monitoring](#4-rum--real-user-monitoring)
5. [Alerting & Incident Management](#5-alerting--incident-management)
6. [Security & Compliance](#6-security--compliance)
7. [Infrastructure Monitoring](#7-infrastructure-monitoring)
8. [Integrations & Ecosystem](#8-integrations--ecosystem)
9. [Developer Experience](#9-developer-experience)
10. [Data Management & Retention](#10-data-management--retention)
11. [Collaboration & Teams](#11-collaboration--teams)
12. [Mobile SDKs](#12-mobile-sdks)
13. [Advanced Analytics & AI](#13-advanced-analytics--ai)
14. [Platform & Multi-tenancy](#14-platform--multi-tenancy)
15. [Deployment & Operations](#15-deployment--operations)
16. [SDK Ecosystem Expansion](#16-sdk-ecosystem-expansion)
17. [OpenTelemetry Native Support](#17-opentelemetry-native-support)

---

## 1. Dashboard & Visualisation

### 1.1 Custom Dashboards (Drag-and-Drop Builder)

**What**: Users build their own dashboards by placing widgets (time-series charts, stat cards, tables, heatmaps, trace waterfalls) on a grid. Each widget queries ClickHouse with a user-defined query or a visual query builder.

**Why**: Every major observability platform (Datadog, Grafana, New Relic) has custom dashboards. The current Watcher24 dashboard has fixed pages — users cannot create their own views. This is the #1 feature request for observability tools.

**Architecture impact**:
- New `dashboards` table in PostgreSQL (org-scoped, JSON widget configs)
- New API routes in console: `GET/POST/PUT/DELETE /api/dashboards`
- `react-grid-layout` for the grid engine
- Widget renderer registry (pluggable chart types)

**Data model**:
```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL,  -- [{id, x, y, w, h, widgetType, widgetConfig}]
  variables JSONB,         -- [{name, type, default, values}] — template variables
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Template Variables (Dashboard-Wide Filters)

**What**: Dashboard-level dropdown filters (e.g., `$environment`, `$service`, `$host`) that propagate to all widgets. Values can be static lists or queried from ClickHouse.

**Why**: Without template variables, users must hardcode service names and environments in every widget query. Grafana made this a standard expectation.

**Integration**: Variables stored in `dashboards.variables` JSONB. Widget queries reference them as `$variable_name` or `{{variable_name}}`. Query builder resolves them before sending to ClickHouse.

### 1.3 Time Range Comparison

**What**: Compare any time range against a previous period (e.g., "this hour vs last hour", "this Tuesday vs last Tuesday"). Displayed as overlaid series or delta values.

**Why**: Every observability user needs to answer "is this normal?" Datadog and Grafana both support this.

**Implementation**: Client-side query doubling — fire two queries (current + previous) and merge results. Stat cards show delta percentage. Line charts show dotted previous-period overlay.

### 1.4 Saved Views / Saved Searches

**What**: Users save their current log/trace/audit explorer state (filters, columns, time range, query) as a named view. Views can be shared with the team or set as default.

**Why**: Current explorers always reset on navigation. Power users build complex filter chains and want persistence.

**Data model**:
```sql
CREATE TABLE saved_views (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  explorer_type TEXT NOT NULL,  -- 'logs', 'traces', 'audit', 'metrics'
  config JSONB NOT NULL,        -- {filters, columns, timeRange, query}
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.5 Chart Type Library

**What**: Beyond the current time-series and stat cards, add:
- **Heatmaps** — Latency distribution over time (like Grafana heatmap panels)
- **Top N lists** — Bar chart of top services/endpoints by error count
- **Funnel charts** — User journey drop-off visualisation
- **Sankey diagrams** — Service dependency flows
- **Geographic maps** — Request origin by country/region (if GeoIP data is captured)
- **Gauge / dial charts** — Single-metric at-a-glance (e.g., error rate %)
- **Table with sparklines** — Table rows with inline mini-charts

**Why**: Different data types need different visualisations. A one-size-fits-all chart type limits insight quality.

### 1.6 Dark/Light Theme

**What**: System-aware or user-selectable theme toggle with full Tailwind dark mode coverage.

**Why**: Already standard in most dev tools. The current console appears to use a single theme. Low implementation effort (Tailwind's `dark:` prefix), high user satisfaction.

### 1.7 Dashboard Sharing & Embedding

**What**:
- **Shareable links** — Public URL with optional password protection and expiry
- **Embedded iframe** — For inserting Watcher24 dashboards into internal wikis/status pages
- **Snapshot export** — PNG/PDF export of a dashboard at a point in time

**Why**: Datadog and Grafana both support sharing. Essential for post-mortems, status pages, and cross-team communication.

---

## 2. Log Management

### 2.1 Log Pattern Detection (Log Clustering)

**What**: Automatically detect recurring log patterns and group similar log lines together. Example: 50k variations of `User X logged in from IP Y` become one pattern `User * logged in from IP *` with a count.

**Why**: This is a standout feature in Datadog's log management. Reduces signal-to-noise ratio dramatically — users see 50 patterns instead of 50,000 individual log lines.

**Implementation approach**: Use Drain3 (Python) or a ClickHouse-based approach with `ngramDistance` or regex-based clustering. Could run as a periodic worker in `analytics-python` that post-processes recent logs and writes patterns to a `log_patterns` ClickHouse table.

**Data model**:
```sql
CREATE TABLE watcher.log_patterns (
  org_id UUID,
  service_name LowCardinality(String),
  pattern_id UUID,
  pattern_template String,
  sample_line String,
  match_count UInt64,
  first_seen DateTime64(3),
  last_seen DateTime64(3),
  severity LowCardinality(String),
  INDEX idx_pattern_template pattern_template TYPE ngrambf_v1(3, 256, 2, 0) GRANULARITY 1
) ENGINE = ReplacingMergeTree()
ORDER BY (org_id, service_name, pattern_id);
```

### 2.2 Full-Text Search Syntax (KQL/Lucene)

**What**: Rich query syntax in the log explorer:
- Field searches: `severity:error AND service:api-gateway`
- Ranges: `duration:>1000`
- Wildcards: `message:*timeout*`
- Boolean operators: `AND`, `OR`, `NOT`
- Grouping: `(error OR warn) AND service:payment`
- Exists: `_exists_:trace_id`
- Regex: `message:/User\s+\d+/`

**Why**: Current log search appears to be basic text match. Power users expect structured queries. Datadog, Elastic, and Grafana (Loki) all support this.

**Implementation**: Parse KQL/Lucene on the console API side, translate to ClickHouse SQL with proper `WHERE` clauses and `match()` functions.

### 2.3 Log Context (Surrounding Lines)

**What**: When viewing a specific log line, show N lines before and after it from the same source/thread. ClickHouse query with `LAG`/`LEAD` window functions or by time-range narrowing.

**Why**: One log line rarely tells the full story. Users need context to understand what led to an error.

### 2.4 Live Tail (Streaming Log View)

**What**: A terminal-like view that streams incoming logs in real-time as they arrive, auto-scrolling. Filter and pause controls.

**Why**: During incident response, engineers want to tail logs live. Already partially possible via WebSocket in the current real-time layer — needs a dedicated UI mode.

**Implementation**: Subscribe to the existing WebSocket feed, render in a virtualised list, auto-scroll toggle, highlight/filter on-the-fly in the browser.

### 2.5 Field Extraction Rules

**What**: Users define parsing rules to extract structured fields from unstructured log messages. Example: from `"Order #12345 placed by user@example.com for $99.99"` extract `order_id=12345`, `user=user@example.com`, `amount=99.99`.

**Why**: Many applications log unstructured text. Without field extraction, those fields are invisible to filters and aggregations.

**Implementation**:
- **Grok patterns** (like Logstash) — predefined named patterns
- **Regex capture groups** — user-defined
- **JSON auto-detection** — automatic (parse if valid JSON)
- Rules stored in Postgres, applied in `analytics-python` workers during processing

### 2.6 Log-Based Metrics

**What**: Generate Counters, Gauges, and Histograms from log queries. Example: "Count of `error` severity logs per minute, per service" becomes a metric that can be charted, alerted on, and dashboarded.

**Why**: Bridging the gap between logs and metrics. Datadog calls this "Log-based Metrics" / "Generate Metrics". Essential for alerting on log patterns.

---

## 3. APM — Application Performance Monitoring

### 3.1 Service Map / Topology Graph

**What**: Auto-generated graph showing services (nodes) and their call relationships (edges). Edges show request rate, error rate, and average latency. Built from distributed trace data.

**Why**: The most requested APM feature after basic traces. Datadog, New Relic, and Grafana all have this. Helps teams understand their architecture at a glance.

**Implementation**: `analytics-python` runs a periodic aggregation job that builds service-to-service edges from trace spans in ClickHouse. Result written to a `service_map` table. Console renders with `reactflow` or `d3-force`.

### 3.2 Apdex Score

**What**: Application Performance Index — a standard measure of user satisfaction based on response time thresholds. Formula: `(Satisfied + Tolerated/2) / Total`. Users define the "satisfied" threshold (e.g., < 500ms).

**Why**: Standard APM metric. Provides a single number for "how is the app performing?" that executives and engineers both understand.

### 3.3 Error Tracking with Fingerprinting

**What**: Group similar errors across services and releases. Fingerprint errors by stack trace structure (file + function, ignoring line numbers and variable values). Track: first seen, last seen, total count, affected users, trend.

**Why**: Sentry's core feature. Without error grouping, every unique error instance is a separate entry — users drown in noise.

**Implementation**: Extend the existing error tracing spec (`error-tracing-auto-instrumentation.md`) with a fingerprinting service or ClickHouse query that groups by `normalized_stack_trace_hash`.

### 3.4 Deployment Tracking (Deployment Markers)

**What**: When a new version is deployed, a marker appears on all time-series charts. Teams can correlate deployments with metric changes, error spikes, or latency regressions.

**Why**: Deployments are the #1 cause of performance regressions. Every APM tool (Datadog, New Relic, Dynatrace) has deployment markers.

**Implementation**:
- New endpoint: `POST /v1/deployments` or SDK method: `client.deployment({ version, environment })`
- Stored in a `deployments` table in ClickHouse (or Postgres)
- Console overlays vertical lines on charts at deployment timestamps

### 3.5 Code-Level Profiling (Continuous Profiling)

**What**: Low-overhead CPU and memory profiling of production applications. Flame graphs showing which functions consume the most CPU, allocate the most memory.

**Why**: Premium feature of Datadog, Grafana Pyroscope, and Google Cloud Profiler. Differentiator for the Pro/Enterprise tiers.

**Implementation**: Long-term vision — would require profiler agents (e.g., Pyroscope SDK integration) and a dedicated ClickHouse table for profiling data. Flame graph rendering with `react-flame-graph`.

### 3.6 Database Query Performance

**What**: Automatically capture and report slow database queries from instrumented applications. Show average latency, call count, and sample queries grouped by normalized SQL.

**Why**: Database is typically the bottleneck. ORMs (Prisma, SQLAlchemy, ActiveRecord) can be instrumented to capture query timing. Sentry and Datadog both offer this.

---

## 4. RUM — Real User Monitoring

### 4.1 Web Vitals Tracking

**What**: Built-in collection of Core Web Vitals (LCP, FID/INP, CLS) plus TTFB, FCP. Dashboard with vitals distribution, threshold pass/fail rates, and breakdown by page/device/browser/geo.

**Why**: Google uses Web Vitals for search ranking. Any frontend observability product must collect and display them. **Prerequisite**: browser SDK (partially specced in `public-token-browser-sdk.md`).

**Implementation**: `@watcher/browser` captures web vitals via `web-vitals` library or `PerformanceObserver` API. Sent as `event_type: "rum"` or `"metric"` with `metric_type: "web_vital"`.

### 4.2 Session Replay

**What**: Record and replay user sessions — DOM snapshots, mouse movements, clicks, scrolls. Privacy controls: mask sensitive inputs, exclude specific elements.

**Why**: rrweb made this feasible. Datadog, LogRocket, and FullStory charge premium prices for session replay. It is a high-value differentiator.

**Implementation complexity**: **High**. Requires `rrweb` integration in the browser SDK, efficient snapshot storage (ClickHouse `Object('json')` or separate blob storage like MinIO/S3), and a replay player in the console. Consider building as a separate premium add-on module.

### 4.3 User Journey / Funnel Analysis

**What**: Define a sequence of user actions (page views, button clicks) and see the drop-off rate at each step. Example funnel: Landing Page → Sign Up → Create Project → First Event.

**Why**: Product teams live on funnel analysis. Not typically found in pure observability tools — this bridges APM with product analytics.

### 4.4 Geographic Distribution Map

**What**: World map showing request origins, error rates, and latency by country/region. Uses GeoIP enrichment on the gateway.

**Why**: Visual storytelling for globally deployed applications. Datadog and Cloudflare show this prominently.

**Implementation**: Gateway already enriches with `ip_address`. Add GeoIP resolution (MaxMind GeoLite2) in gateway middleware. Console renders with `react-simple-maps` or `deck.gl`.

---

## 5. Alerting & Incident Management

### 5.1 Incident Management Lifecycle

**What**: Full incident workflow: Declare → Investigate → Mitigate → Resolve → Post-mortem. Track timeline, assign roles (incident commander, communications lead), post status updates.

**Why**: Phase 8 of the implementation guide covers alerting, but not incident management. OpsGenie, PagerDuty, and Grafana Incident Management own this space. Building a lightweight version creates stickiness.

**Data model**:
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'open', 'investigating', 'mitigated', 'resolved'
  severity TEXT NOT NULL,
  commander_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  timeline JSONB DEFAULT '[]',  -- [{timestamp, user, action, note}]
  linked_alerts UUID[],
  postmortem TEXT
);
```

### 5.2 On-Call Schedules & Escalation Policies

**What**: Define on-call rotations (weekly, daily, custom). Escalation chains: if primary doesn't acknowledge in 5 min, escalate to secondary.

**Why**: Every alert needs to reach a human. Without on-call management, the alerting feature is incomplete.

### 5.3 Alert Grouping & Noise Reduction

**What**: Multiple related alerts are grouped into a single notification. Example: 50 services all report "connection timeout to Redis" → one grouped alert "Redis connection issue affecting 50 services".

**Why**: Alert fatigue is the #1 complaint about monitoring tools. Intelligent grouping reduces noise.

**Implementation**: Group by `alert_rule_id` + time window (e.g., 5 min sliding). Configurable grouping keys. Aggregation window in the alert engine.

### 5.4 Maintenance Windows / Silence Rules

**What**: Schedule planned downtime during which specific alerts are suppressed. "Don't alert me about `payment-service` between 2am-4am Sunday."

**Why**: Essential for planned maintenance, deployments, and known outages. Prevents false alarms.

### 5.5 Alert Notification Templates

**What**: Customisable templates for alert notifications (Slack message format, email subject/body, webhook payload). Use Handlebars/Mustache templating with alert context variables.

**Why**: Different teams want different notification formats. Operations wants a terse Slack message; managers want an email summary.

---

## 6. Security & Compliance

### 6.1 PII / Sensitive Data Redaction

**What**: Automatically detect and redact/mask personally identifiable information (emails, credit cards, SSNs, phone numbers, API keys) from log messages, trace attributes, and event payloads before storage.

**Why**: GDPR, CCPA, HIPAA require data minimisation. Without PII scanning, Watcher24 cannot serve regulated industries.

**Implementation**: Gateway-level or worker-level middleware that scans event payloads with regex + ML-based PII detection (e.g., Microsoft Presidio). Redacted values replaced with `<REDACTED>` or hashed with a salt.

### 6.2 Audit Report Generation

**What**: One-click generation of compliance reports (SOC2, ISO 27001, GDPR data processing records, HIPAA audit logs). PDF export with branded cover page.

**Why**: The platform already collects audit events. Generating compliance reports from them is a high-value add for Pro/Enterprise customers.

### 6.3 RBAC with Custom Roles

**What**: Beyond the existing owner/admin/member roles, allow org admins to create custom roles with fine-grained permissions (view logs only, manage alerts, edit dashboards, etc.).

**Why**: Large organisations need granular access control. The IAM system already has a `resources` and `actions` table — this extends it.

**Data model** (extending existing IAM schema):
```sql
-- already exists in IAM: resources, actions
-- new: custom roles
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL  -- [{resource, action: ['read','write']}]
);
```

### 6.4 SIEM Features (Security Information & Event Management)

**What**: Pre-built security detection rules:
- Brute-force login detection (failed logins > threshold)
- Privilege escalation detection
- Data exfiltration detection (unusual data volume)
- Geographic anomaly detection (login from new country)
- Suspicious API key usage patterns

**Why**: Watcher24's audit log pipeline is already collecting the right data. Adding SIEM rules turns it into a lightweight security product. Elastic and Splunk dominate SIEM — but a simpler, developer-friendly alternative has market space.

### 6.5 Audit Log Immutability & Chain of Custody

**What**: Cryptographically verify that audit logs have not been tampered with. Merkle tree chaining or blockchain-style hashing of log batches.

**Why**: Required for legal admissibility of audit data. Datadog Audit Trail offers tamper-proof logs for Enterprise customers.

---

## 7. Infrastructure Monitoring

### 7.1 Host & Container Metrics

**What**: Collect CPU, memory, disk I/O, network I/O from VMs and containers. Dashboards: host list with health status, per-host detail with time-series.

**Why**: Currently Watcher24 relies on SDKs sending `event_type: "metric"` — the SDK must be integrated. For infrastructure metrics, a lightweight agent is needed.

**Implementation**: A new `watcher-agent` binary (Go, like Datadog Agent) that runs on hosts, collects system metrics (via `gopsutil` or Prometheus `node_exporter`), and forwards to the Watcher24 gateway.

### 7.2 Kubernetes Monitoring

**What**: Auto-discover pods, deployments, services. Collect pod-level metrics, watch for crashes/restarts, surface Kubernetes events.

**Why**: Most production workloads run on Kubernetes. Datadog, Grafana, and New Relic all have deep Kubernetes integrations.

**Implementation**: Kubernetes controller or Helm chart that deploys `watcher-agent` as a DaemonSet with cluster-level RBAC.

### 7.3 Cloud Provider Cost Integration

**What**: Connect AWS/GCP/Azure billing APIs to correlate infrastructure cost with application performance. "This service costs $500/day and has 2% error rate."

**Why**: FinOps is growing. Datadog Cloud Cost Management is a premium feature. Showing cost alongside performance is a unique differentiator.

### 7.4 Synthetic Monitoring / Uptime Checks

**What**: Configurable HTTP/TCP/SSL checks from multiple geographic locations. "Hit `https://api.example.com/health` from us-east, eu-west, ap-southeast every 60s." Alert on failure or latency threshold.

**Why**: External perspective on availability. Synthetic monitoring complements internal observability. Status page integration (Section 9.4).

### 7.5 SSL Certificate Monitoring

**What**: Track SSL/TLS certificate expiry dates for monitored endpoints. Alert when certificates are approaching expiry (30d, 14d, 7d, 1d).

**Why**: Expired certificates cause outages. Simple feature, high value.

---

## 8. Integrations & Ecosystem

### 8.1 Webhook Integration Catalog

**What**: Pre-built integrations for popular tools beyond the planned Slack/email/PagerDuty:
- Discord
- Microsoft Teams
- Jira (auto-create ticket from alert)
- Linear (auto-create issue)
- GitHub Issues
- ServiceNow
- OpsGenie
- VictorOps
- Zendesk
- Webhook (custom JSON payload)

**Why**: The more tools Watcher24 integrates with, the more embedded it becomes in workflows.

### 8.2 ChatOps Integration

**What**: Slack/Teams bot that responds to commands:
- `/watcher status` — health summary
- `/watcher logs service=api-gateway severity=error` — query logs
- `/watcher incident create "payment-service down"` — declare incident
- `/watcher ack alert-123` — acknowledge an alert

**Why**: Developers live in chat. ChatOps reduces context switching. PagerDuty and Datadog both have Slack commands.

### 8.3 Terraform Provider

**What**: Manage Watcher24 resources via Terraform: alert rules, dashboards, monitors, API keys, applications.

**Why**: Infrastructure-as-code teams expect it. Grafana, Datadog, and PagerDuty all have Terraform providers. Enables GitOps workflows.

### 8.4 CLI Tool (`watcher`)

**What**: A CLI for managing Watcher24 configuration:
- `watcher init` — bootstrap a project
- `watcher dashboards export/import` — sync dashboards to git
- `watcher monitors apply -f monitor.yaml` — declarative alert config
- `watcher tail --service api-gateway` — live log tail in terminal

**Why**: Developer ergonomics. Datadog has `datadog-ci`, Sentry has `sentry-cli`. CLI enables CI/CD integration beyond SDKs.

### 8.5 Grafana Data Source Plugin

**What**: A Grafana plugin that queries Watcher24's ClickHouse (or a query API) so users who already use Grafana can add Watcher24 as a data source.

**Why**: Grafana has massive adoption. Being a data source rather than trying to replace Grafana is a pragmatic go-to-market strategy.

### 8.6 Migration Tools

**What**: Import tools that help teams migrate from competitors:
- Datadog → Watcher24: dashboard JSON converter, alert migration
- Sentry → Watcher24: project/DSN → app/API key mapping
- New Relic → Watcher24: NRQL → ClickHouse SQL translator

**Why**: Reducing migration friction is essential for adoption. Every observability platform has some form of migration helper.

---

## 9. Developer Experience

### 9.1 Public Status Page

**What**: `status.watcher24.io` showing platform uptime, incident history, and scheduled maintenance. Powered by Watcher24's own monitoring.

**Why**: Every SaaS must have a status page. Builds trust. Shows Watcher24 "drinking its own champagne."

**Implementation**: Can be a simple static site updated via API, or use the synthetic monitoring feature to self-monitor and auto-update status.

### 9.2 API Changelog & Versioning

**What**: Documented changelog for the ingest API and SDK APIs. Deprecation notices, migration guides, breaking change warnings.

**Why**: API consumers need to know when things change. The current `/v1/` endpoints have no documented version policy.

### 9.3 SDK Generation from OpenAPI Spec

**What**: Publish an OpenAPI 3.1 spec for the ingestion API. Auto-generate SDKs for Go, Java, Rust, Ruby, .NET, PHP using OpenAPI Generator.

**Why**: Dramatically accelerates SDK ecosystem expansion. Manual SDK writing (current approach) is unsustainable for 10+ languages.

### 9.4 Interactive API Explorer

**What**: Swagger UI or Scalar-based API reference at `docs.watcher24.io/api` with "Try It" functionality. Auto-generated from OpenAPI spec.

**Why**: Standard API documentation expectation. Reduces support burden.

### 9.5 Postman Collection

**What**: Maintained Postman collection with all API endpoints, example requests, and environment variables pre-configured.

**Why**: Many developers explore APIs via Postman before integrating an SDK. Low effort, high discoverability.

### 9.6 In-App What's New / Changelog

**What**: A "What's New" modal or banner in the console showing recent feature releases, improvements, and fixes.

**Why**: Keeps users informed about new capabilities they might otherwise miss. Increases feature adoption.

---

## 10. Data Management & Retention

### 10.1 Tiered Data Retention (per-plan enforcement)

**What**: Enforce data retention based on subscription plan:
- Free: 7 days
- Pro: 90 days (current hardcoded TTL)
- Enterprise: 365 days / custom

**Why**: The current 90-day TTL is hardcoded in the ClickHouse migration. Different plans need different retention. This is essential for the billing model to work correctly.

**Implementation**: Per-org TTL override in ClickHouse `events` table (using `TTL` with per-partition expressions), or a worker that periodically drops partitions beyond the per-org retention window.

### 10.2 Data Archival (Cold Storage)

**What**: Archive old events to MinIO/S3 in compressed Parquet format before ClickHouse TTL deletion. Rehydrate on demand for historical analysis.

**Why**: Enterprise customers need long-term retention for compliance but don't need hot query access. Tiered storage reduces ClickHouse cost.

### 10.3 Data Export

**What**: Export filtered event sets as CSV, JSON, or Parquet. Schedule recurring exports. Export entire org data for off-boarding.

**Why**: GDPR data portability requirement. Enterprise customers want raw data access.

### 10.4 Data Residency Controls

**What**: Allow orgs to specify data storage region (EU, US, APAC). Events are routed to region-specific ClickHouse clusters. Console enforces region-specific access.

**Why**: GDPR/Schrems II compliance. European customers increasingly require EU-only data storage. A key Enterprise feature.

**Implementation complexity**: **High**. Requires multi-region ClickHouse deployment, region-aware gateway routing, and cross-region console federation.

### 10.5 Backup & Disaster Recovery

**What**: Automated ClickHouse and PostgreSQL backups. Point-in-time recovery. Backup verification testing.

**Why**: Currently no backup strategy in the codebase. Production readiness baseline.

---

## 11. Collaboration & Teams

### 11.1 Comment Threads on Events

**What**: Team members can comment on specific log lines, trace spans, or error events. Threaded discussions. @mentions with notifications.

**Why**: During incidents, teams need to discuss specific observability data inline rather than switching to Slack. Datadog has Notebooks with comments; Sentry has issue comments.

### 11.2 Activity Feed

**What**: Audit trail of all actions within the Watcher24 platform: who created/deleted a dashboard, who changed an alert rule, who invited a team member.

**Why**: Enterprise governance requirement. The IAM system could emit these as audit events consumed by the platform itself.

### 11.3 Shared Runbooks / Notebooks

**What**: Markdown documents stored in Watcher24, linked to dashboards, alerts, and services. Live charts embedded in the document. Template runbooks for common incident types.

**Why**: Datadog Notebooks are heavily used for post-incident reviews and operational runbooks. Replaces scattered Google Docs.

---

## 12. Mobile SDKs

### 12.1 React Native SDK

**What**: `@watcher/react-native` package wrapping the core + native HTTP transport. Capture JavaScript errors, native crashes, and performance metrics.

**Why**: React Native is widely used. Sentry has a strong React Native SDK — this is table stakes for mobile observability.

### 12.2 Flutter SDK

**What**: `watcher_flutter` package for Dart/Flutter apps. Capture Dart exceptions, platform channel errors, and widget build performance.

**Why**: Flutter is growing rapidly for cross-platform mobile development. Sentry and Datadog both have Flutter SDKs.

### 12.3 Native iOS & Android SDKs

**What**: `WatcherIOS` (Swift Package) and `WatcherAndroid` (Gradle dependency). Crash reporting via platform crash handlers, network monitoring via URLProtocol/OkHttp interceptors.

**Why**: For teams building native mobile apps. Requires dedicated mobile engineers to build and maintain.

### 12.4 Mobile Crash Reporting

**What**: Symbolicated crash reports for iOS (dSYM) and Android (ProGuard mapping). Group similar crashes, track regression/ resolution, show affected users.

**Why**: Mobile crash reporting is the #1 mobile observability need. Sentry and Firebase Crashlytics dominate this space.

---

## 13. Advanced Analytics & AI

### 13.1 ML-Based Anomaly Detection

**What**: Beyond the Phase 9 AI analytics (NL query + summaries), apply machine learning models for:
- **Seasonal decomposition** — Detect anomalies accounting for daily/weekly patterns
- **Forecasting** — Predict future metric values with confidence bands
- **Change point detection** — Identify when a metric's behaviour fundamentally changed

**Why**: Datadog Watchdog and AWS CloudWatch Anomaly Detection use these techniques. Reduces false positives from threshold-based alerts.

### 13.2 Log-to-Metric-to-Trace Correlation

**What**: Clicking a spike in a metric chart shows related logs and example traces from that time window. Automatic correlation guidance: "This error spike correlates with a deployment at 14:32 and a Redis timeout."

**Why**: The promise of unified observability is correlation across pillars. Currently logs, metrics, and traces are separate views in the console.

### 13.3 Scheduled Reports

**What**: Weekly/monthly PDF/email reports with key metrics, top errors, alert summaries, and trend charts. Configurable recipients and content.

**Why**: Managers and executives want push-based summaries — they won't log into a dashboard.

### 13.4 Custom SQL Query Console

**What**: An in-console SQL editor with syntax highlighting, autocomplete (ClickHouse schema-aware), query history, and result visualisation. Read-only access to the ClickHouse `watcher` database.

**Why**: Power users want direct SQL access. Grafana's Explore mode and Datadog Notebooks with SQL cells enable this. Must be permission-gated.

### 13.5 AI-Powered Incident Summaries

**What**: When an incident is resolved, auto-generate a summary including timeline, affected services, root cause analysis hints, and metrics during the incident window.

**Why**: Post-incident documentation is consistently neglected. Automating it increases follow-through. Phase 9 covers AI-generated summaries — this extends it specifically for the incident lifecycle.

---

## 14. Platform & Multi-tenancy

### 14.1 Custom Domain / White-Labeling

**What**: Enterprise customers can use their own domain (`observability.acme.com` → Watcher24 console) with custom branding (logo, colors, favicon).

**Why**: Large enterprises often require white-labeling. Datadog and Sentry offer this on Enterprise plans.

### 14.2 Embedded Dashboard Components

**What**: JavaScript snippet that embeds a specific Watcher24 chart/stat/dashboard into any web page. Authenticated via iframe with token.

**Why**: Teams want to surface observability data in internal tools, wikis, and CI/CD dashboards. Acts as a distribution channel.

### 14.3 Usage-Based Pricing Refinements

**What**: Beyond the current flat plan limits (100k / 5M / unlimited events):
- Per-feature pricing (error tracking +$X/mo, session replay +$Y/mo)
- Overage billing (Pro plan: $Z per 1M events over 5M)
- Log retention tiers (additional retention days as add-on)
- Seat-based pricing for team members

**Why**: Current pricing is simple but leaves money on the table. Feature-based pricing matches Datadog's model.

### 14.4 Trial Experience

**What**: 14-day free Pro trial with no credit card required. Onboarding wizard tracks completion. Conversion emails at day 3, 7, 14. "Trial ending" notification.

**Why**: Current onboarding exists but a structured trial increases conversion. The infrastructure for plan enforcement (gateway quota checking) already exists.

---

## 15. Deployment & Operations

### 15.1 Kubernetes Operator

**What**: A Kubernetes operator that manages Watcher24 deployment lifecycle: auto-scaling gateway replicas, Redis/ClickHouse monitoring, backup scheduling, configuration management.

**Why**: Phase 10 mentions K8s + Helm but an operator is the modern K8s-native approach. Enables Day-2 operations automation.

### 15.2 Multi-Region / Edge Ingestion

**What**: Deploy gateway instances in multiple regions. Clients send to the nearest edge (latency-based DNS or Anycast). Events are routed to a central ClickHouse or a region-specific cluster.

**Why**: Globally distributed applications need low-latency ingestion. The current single-gateway model adds latency for non-local clients.

### 15.3 High Availability Configuration

**What**: Documented HA/DR topology: multi-AZ ClickHouse (replication), PostgreSQL primary+standby, Redis Sentinel/Cluster, gateway horizontal scaling behind load balancer.

**Why**: The docker-compose setup is single-instance. Production requires documented HA architecture.

### 15.4 CI/CD Pipeline Templates

**What**: Reference GitHub Actions / GitLab CI workflows for:
- SDK release (version bump, changelog, npm/pypi publish)
- Infrastructure provisioning (Terraform apply)
- Database migrations (ClickHouse + Postgres)
- Docker image build + push

**Why**: Currently no CI/CD config exists. Production teams need deployment automation.

---

## 16. SDK Ecosystem Expansion

### 16.1 Go SDK

**What**: `watcher-go` package. Native Go client with `context` propagation, structured logging integration (`slog`), HTTP middleware for `net/http` and popular routers (chi, gin, fiber).

**Why**: The gateway and realtime services are written in Go — dogfooding a Go SDK is natural. Many Go microservices exist.

### 16.2 Java / Spring Boot SDK

**What**: `watcher-spring-boot-starter`. Auto-configuration, `@Trace` annotation for method tracing, Servlet filter for HTTP tracing, Logback/Log4j2 appender for log forwarding.

**Why**: Java/Spring Boot is the #1 enterprise backend framework. The error-tracing spec already covers Java frame capture — this extends it to a full SDK.

### 16.3 Rust SDK

**What**: `watcher` crate. Tokio-based async client, `tracing` subscriber integration, actix-web/axum middleware.

**Why**: Growing language in infrastructure and performance-critical services. Sentry has a Rust SDK.

### 16.4 .NET SDK

**What**: `Watcher.NET` NuGet package. ASP.NET Core middleware, ILogger provider, `ActivitySource` integration for distributed tracing.

**Why**: Large enterprise market. .NET is underrepresented in the current SDK planning.

### 16.5 Ruby SDK

**What**: `watcher` gem. Rails Railtie for auto-instrumentation, Sidekiq middleware, Rack middleware.

**Why**: Ruby/Rails still powers many startups and mid-size companies. Sentry and Datadog both have Ruby SDKs.

### 16.6 PHP SDK

**What**: `watcher-php` Composer package. Laravel service provider, PSR-3 logger integration, Guzzle middleware.

**Why**: PHP (especially Laravel) remains widely deployed. Low competition in observability SDKs for PHP.

---

## 17. OpenTelemetry Native Support

### 17.1 OTLP Ingestion Endpoint

**What**: Native OpenTelemetry Protocol (OTLP) over gRPC and HTTP at `https://ingest.watcher24.io/v1/otlp`. Accept traces, metrics, and logs without requiring the Watcher24 SDK. Just point the OTel Collector exporter at Watcher24.

**Why**: OpenTelemetry is the industry standard. Companies already using OTel can adopt Watcher24 without changing instrumentation code. Mentioned in Phase 10 but critical enough to call out separately.

**Implementation**: Add an OTLP receiver to the gateway (using OpenTelemetry Go SDK's OTLP receiver components). Map OTel resource attributes → Watcher24 org/service/environment. Translate OTel spans/traces to Watcher24 event format and publish to Redis Streams.

### 17.2 Prometheus Remote Write

**What**: Accept Prometheus metrics via the `remote_write` protocol. Any Prometheus instance can forward metrics to Watcher24.

**Why**: Prometheus is ubiquitous in Kubernetes environments. Direct integration without SDKs dramatically expands the addressable market.

### 17.3 OpenMetrics Support

**What**: Standard OpenMetrics scrape endpoint on the gateway or a separate metrics endpoint. Prometheus-compatible `/metrics` endpoint.

**Why**: Enables Prometheus to scrape Watcher24 for internal platform metrics. Also enables other OpenMetrics-compatible systems to ingest Watcher24 metrics.

---

## Prioritisation Matrix

| Tier | Feature Category | Business Impact | Implementation Complexity |
|---|---|---|---|
| **P0 — Immediate** | Custom Dashboards (1.1) | Very High | Medium |
| **P0 — Immediate** | Log Pattern Detection (2.1) | High | Medium |
| **P0 — Immediate** | Error Fingerprinting (3.3) | High | Medium |
| **P0 — Immediate** | Service Map (3.1) | High | Medium |
| **P1 — Near-term** | Full-Text Search (2.2) | High | Low |
| **P1 — Near-term** | Deployment Tracking (3.4) | Medium | Low |
| **P1 — Near-term** | Alert Grouping (5.3) | High | Medium |
| **P1 — Near-term** | Incident Management (5.1) | High | High |
| **P1 — Near-term** | OTLP Ingest (17.1) | Very High | High |
| **P1 — Near-term** | RBAC Custom Roles (6.3) | Medium | Medium |
| **P2 — Growth** | Session Replay (4.2) | Very High | Very High |
| **P2 — Growth** | PII Redaction (6.1) | High | Medium |
| **P2 — Growth** | Host/K8s Monitoring (7.1, 7.2) | High | High |
| **P2 — Growth** | Go SDK (16.1) | Medium | Medium |
| **P2 — Growth** | On-Call Schedules (5.2) | Medium | High |
| **P3 — Mature** | Data Residency (10.4) | Medium | Very High |
| **P3 — Mature** | Continuous Profiling (3.5) | Medium | High |
| **P3 — Mature** | Mobile SDKs (12.x) | Medium | High |
| **P3 — Mature** | Terraform Provider (8.3) | Medium | Medium |
| **P3 — Mature** | White-Labeling (14.1) | Low | Medium |
| **P3 — Mature** | Code-Level Profiling (3.5) | Medium | Very High |

---

## Features Already Planned (Excluded from This Document)

These are acknowledged in existing docs and are **not** included as "new" features above:

| Feature | Source Document | Status |
|---|---|---|
| Phase 7 MVP (auth onboarding, billing polish, docs site, admin panel) | `console-plan.md` | 🔨 In Progress |
| Phase 8 Alert Engine | `console-plan.md` | 📋 Planned |
| Phase 9 AI Analytics (NL query, anomaly detection, summaries) | `console-plan.md` | 📋 Planned |
| Phase 10 Enterprise (Kafka, K8s, OTLP, SSO, data export) | `console-plan.md` | 📋 Planned |
| Public Token / Browser SDK security model | `public-token-browser-sdk.md` | 📋 Planned |
| Error Tracing & Auto-Instrumentation (stack capture, source maps) | `error-tracing-auto-instrumentation.md` | 📋 Planned |
| Browser SDK (`@watcher/browser` transport + React hooks) | Partially built, some in spec | 🔨 In Progress |
| Multi-App Support (`applications` table, app-scoped keys) | `multi-app-implementation.md` | ✅ Complete |
