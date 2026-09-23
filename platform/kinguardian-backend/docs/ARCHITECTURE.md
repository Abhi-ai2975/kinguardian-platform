# KinGuardian Platform Architecture Specification

This document provides the definitive architectural specification for the **KinGuardian Platform Backend**, detailing system context, bounded domains, data ownership, security boundaries, event-driven choreography, database schemas, authorization models, and notification pipelines.

---

## 1. System Context Diagram (C4 Level 1 & 2)

```mermaid
C4Context
    title KinGuardian Platform - System Context & Container Diagram

    Person(caregiver, "Care Coordinator / Adult Child", "Monitors aging parents, manages tasks, coordinates appointments, receives Guardian Moments.")
    Person(parent, "Aging Parent / Care Subject", "Logs daily check-ins, confirms medication doses, views care circle updates.")
    Person(clinician, "Attending Physician / Doctor", "Reviews appointment summaries, clinical trends, and historical records.")

    System_Boundary(kinguardian_boundary, "KinGuardian Core Platform (Modular Monolith)") {
        Container(api_gateway, "API & Realtime Gateway", "FastAPI, WebSockets, SSE", "Handles mobile/web ingress, JWT authentication, rate limiting, and projection invalidations.")
        Container(domain_modules, "Domain Modules (13 Bounded Contexts)", "Python 3.12, Clean Architecture", "Executes business logic, domain state machines, and use cases.")
        Container(event_engine, "Event Choreography & Outbox Engine", "NATS JetStream / In-Memory Bus", "Guarantees reliable cross-domain event dispatch and distributed sagas.")
        ContainerDb(postgres_db, "PostgreSQL 16 Database", "PostgreSQL + pgvector", "Primary relational store with row-level tenancy and monthly range partitioning.")
        ContainerDb(redis_cache, "Redis 7 Cache & Realtime Hub", "Redis Cluster", "Query cache, WebSocket connection registry, and idempotency store.")
    }

    System_Ext(iam_service, "IAM Identity Service", "JWKS / OAuth2 / OIDC", "Issues user access tokens and handles credential authentication.")
    System_Ext(fhir_service, "FHIR R4 EMR Service", "HAPI FHIR / Hospital EMR", "Stores and serves clinical resources (Observations, Medications, Appointments).")
    System_Ext(filenest_service, "FileNest Object Store", "WORM Compliant S3/Blob Storage", "Stores immutable medical PDFs, discharge summaries, and diagnostic scans.")
    System_Ext(agent_runtime, "KinGuardian Agent / LLM Gateway", "Gemini Pro / OpenAI / Claude", "Generates clinical summaries, trend insights, and appointment preparation briefs.")
    System_Ext(notif_providers, "Notification Providers", "FCM, Twilio, WhatsApp Cloud, SendGrid", "Multi-channel message delivery network.")
    System_Ext(wearables_feed, "Global Wearables & Labs", "Apple Health, Fitbit, Garmin, Oura, Lal PathLabs", "Wearable and diagnostic telemetry pipelines.")

    Rel(caregiver, api_gateway, "Uses Mobile App / Web", "HTTPS / WSS / Bearer JWT")
    Rel(parent, api_gateway, "Uses Mobile App / WhatsApp", "HTTPS / WSS / WhatsApp Webhook")
    Rel(clinician, api_gateway, "Views Prepared Summaries", "HTTPS / SMART on FHIR")

    Rel(api_gateway, domain_modules, "Invokes Use Cases", "In-Process Clean Architecture Calls")
    Rel(domain_modules, event_engine, "Publishes Domain Events", "Outbox / Async Bus")
    Rel(domain_modules, postgres_db, "Reads / Writes State", "SQLAlchemy 2.0 AsyncPG")
    Rel(domain_modules, redis_cache, "Caches Projections & Locks", "Redis Protocol")

    Rel(api_gateway, iam_service, "Validates JWKS Signatures", "HTTPS / JWKS")
    Rel(domain_modules, fhir_service, "Proxies Authorized Clinical Data", "HTTPS / M2M Internal Auth")
    Rel(domain_modules, filenest_service, "Generates Signed URLs", "HTTPS / HMAC-SHA256")
    Rel(domain_modules, agent_runtime, "Executes Guarded Prompts", "HTTPS / Server-Side API Key")
    Rel(event_engine, notif_providers, "Dispatches Multi-Channel Alerts", "HTTPS / Webhooks")
    Rel(wearables_feed, domain_modules, "Pushes Normalized Telemetry", "HTTPS Ingestion Pipeline")
```

---

## 2. Bounded Domain Contexts

The modular monolith is structured into **13 discrete bounded contexts** organized into 4 strict clean-architecture layers:

```mermaid
flowchart TD
    subgraph IdentityContext["1. Identity & Tenancy Domain"]
        ID["identity (AppProfile, Organizations, Subscriptions)"]
    end

    subgraph FamilyContext["2. Family & Care Circles Domain"]
        FAM["family (CareCircle, Memberships, Relationships)"]
        CARE["care (CareSubjects, CareTasks, Check-ins)"]
        CONS["consent (Granular Consent Scopes, Break-Glass)"]
        COMM["communication (Family Chat, Conversations, Media)"]
    end

    subgraph ClinicalContext["3. Clinical & Document Domain"]
        CLIN["clinical (FHIR R4 Adapter, Vitals, Observations)"]
        MED["medication (Prescriptions, Adherence State Machine)"]
        APPT["appointment (Coordination, Preparation Workflow)"]
        DOC["documents (HealthDocuments, FileNest WORM, OCR)"]
    end

    subgraph IntelligenceContext["4. Intelligence & Operations Domain"]
        INS["insight (Trend Analytics, Baselines, Guardian Moments)"]
        AI["ai (KinGuardian Agent, Safety Shields, Tool Gatekeeper)"]
        NOTIF["notification (Policy Rules, Multi-Channel Delivery)"]
        AUDIT["audit (Immutable Event Logs, Legal Holds)"]
    end

    IdentityContext --> FamilyContext
    FamilyContext --> ClinicalContext
    ClinicalContext --> IntelligenceContext
```

### Clean Architecture Layering Rules:
1. **Domain Layer (`domain/`)**: Pure business entities, value objects, domain exceptions, and state machine transitions. Zero dependencies on database or web frameworks.
2. **Application Layer (`application/`)**: Explicit use cases, application services, permission verifiers, and transaction coordinators.
3. **Infrastructure Layer (`infrastructure/`)**: SQLAlchemy ORM models, repository implementations with `selectinload`, and external gateway adapters.
4. **Presentation Layer (`presentation/`)**: FastAPI routers, Pydantic v2 DTO schemas, and WebSocket/SSE endpoints.

---

## 3. Data Ownership Matrix

Each database table is exclusively owned by a single domain module. Cross-domain data access occurs **only** through domain repository protocols or asynchronous domain events—direct foreign table joins across domain boundaries are forbidden.

| Domain Module | Primary Tables Owned | Entity Types | Access Policy for Other Domains |
| :--- | :--- | :--- | :--- |
| **`identity`** | `app_profiles`, `organizations` | `AppProfileEntity`, `OrganizationEntity` | Read-only via `IAppProfileRepository`. |
| **`family`** | `families`, `family_memberships`, `family_relationships` | `FamilyEntity`, `FamilyMembershipEntity` | Read/Write via `IFamilyRepository`. |
| **`care`** | `care_subjects`, `care_relationships`, `care_tasks`, `wellbeing_checkins` | `CareSubjectEntity`, `CareTaskEntity`, `WellbeingCheckinEntity` | Managed via `FamilyService`. |
| **`consent`** | `consents` | `ConsentEntity` | Evaluated via `IConsentRepository` & `PermissionVerifier`. |
| **`medication`**| `medication_adherence_events` | `MedicationAdherenceEventEntity` | Mutated via `ConfirmMedicationUseCase`. |
| **`appointment`**| `appointment_coordinations` | `AppointmentCoordinationEntity` | Managed via `AppointmentPreparationWorkflow`. |
| **`documents`** | `health_documents`, `document_extractions` | `HealthDocumentEntity`, `DocumentExtractionEntity` | Controlled via `FileSecurityBoundary`. |
| **`communication`**| `family_conversations`, `family_messages` | `FamilyConversationEntity`, `FamilyMessageEntity` | Accessed via `ConversationsRouter`. |
| **`insight`** | `ai_insights`, `ai_insight_sources`, `monitoring_preferences` | `AIInsightEntity`, `MonitoringPreferenceEntity` | Generated by `TrendAnalyticsEngine`. |
| **`ai`** | `agent_interactions`, `ai_actions`, `ai_conversations` | `AgentInteractionEntity`, `AIActionEntity` | Guarded via `AISecurityBoundary`. |
| **`notification`**| `notifications`, `notification_deliveries` | `NotificationEntity`, `NotificationDeliveryEntity` | Dispatched via `NotificationService`. |
| **`audit`** | `event_logs`, `outbox_events` | `EventLogEntity`, `OutboxEventEntity` | Append-only via `EventService` & `OutboxService`. |

---

## 4. Security Boundaries

```mermaid
flowchart TD
    subgraph MobileClient["Mobile Client (Caregiver / Parent App)"]
        APP["KinGuardian App"]
    end

    subgraph SecurityBoundaries["KinGuardian Gateway & Security Boundaries"]
        IAM_B["1. IAM Boundary<br/>• RS256/HS256 JWKS validation<br/>• Token claim extraction (sub, user_id)"]
        FHIR_B["2. FHIR Boundary<br/>• Zero direct client FHIR access<br/>• Consent & RBAC proxy evaluation<br/>• Internal M2M credential injection"]
        FILE_B["3. FileNest Boundary<br/>• Zero master storage keys exposed<br/>• Short-lived HMAC signed URLs (max 15m)<br/>• MIME whitelisting & Quarantine blocks"]
        AI_B["4. AI Boundary<br/>• Zero LLM provider keys on mobile<br/>• Untrusted input containment (<untrusted_user_text>)<br/>• Deterministic tool gatekeeping outside LLM"]
    end

    subgraph ProtectedDownstream["Protected Internal & Cloud Services"]
        IAM_SRV[("IAM Identity Provider")]
        FHIR_SRV[("FHIR R4 EMR Server")]
        FILE_SRV[("FileNest WORM Storage")]
        AI_SRV[("Gemini / OpenAI Agent Gateway")]
    end

    APP --> IAM_B --> IAM_SRV
    APP --> FHIR_B --> FHIR_SRV
    APP --> FILE_B --> FILE_SRV
    APP --> AI_B --> AI_SRV

    APP -.->|Direct Bypass Attempt: BLOCKED| FHIR_SRV
    APP -.->|Direct Bypass Attempt: BLOCKED| FILE_SRV
    APP -.->|Direct Bypass Attempt: BLOCKED| AI_SRV
```

### A. IAM Boundary
- Validates cryptographic JWT signatures against the identity provider JWKS endpoint.
- Maps the external identity `sub` claim to internal `AppProfile.id`.
- Rejects unauthenticated requests with **HTTP 401 Unauthorized**.

### B. FHIR Security Boundary
- Mobile clients never communicate directly with the FHIR R4 server.
- All clinical queries (`/api/v1/clinical/*`) require active parent consent (`ConsentType.CLINICAL_READ` with `vitals`/`medications` flags).
- Server translates `(requester_id, subject_id)` $\to$ `fhir_patient_id` and executes authenticated internal M2M queries.
- Direct bypass attempts or missing consent requests return **HTTP 403 Forbidden**.

### C. FileNest Security Boundary
- Master storage credentials (`FILENEST_API_KEY`, S3 access/secret keys) are never transmitted to clients.
- Uploads and downloads use short-lived (max 900s TTL) HMAC-SHA256 signed URLs.
- MIME type whitelist enforces clinical formats (`.pdf`, `.png`, `.jpeg`, `.webp`, `.heic`).
- Executable files and quarantined files (failing antivirus scans) are blocked.

### D. AI Security Boundary
- Zero model-provider API keys are exposed to mobile clients.
- User text, OCR outputs, and voice transcripts are treated as untrusted and wrapped in `<untrusted_user_text>` tags.
- Tool requests from the LLM are evaluated deterministically by [`ExternalToolAuthorizationGatekeeper`](file:///d:/Kalyan/kinguardian-platform/platform/kinguardian-backend/app/domains/agent/safety.py) strictly outside the model.
- High-risk clinical actions enforce a Human-in-the-Loop approval workflow (`status="awaiting_approval"`).

---

## 5. Event Flow & Transactional Outbox Pattern

```mermaid
sequenceDiagram
    autonumber
    actor Parent as Parent Mobile App
    participant API as KinGuardian API
    participant DB as PostgreSQL 16
    participant Outbox as Outbox Dispatcher
    participant Bus as Event Bus (NATS / In-Memory)
    participant Notif as Notification Engine
    participant Redis as Redis Cache Hub
    actor Coord as Coordinator Mobile App

    Parent->>API: POST /api/v1/medications/confirm (idempotency_key)
    activate API
    Note over API,DB: BEGIN LOCAL DB TRANSACTION
    API->>DB: UPDATE medication_adherence_events SET status='taken'
    API->>DB: INSERT INTO event_logs (medication_taken)
    API->>DB: INSERT INTO outbox_events (status='pending')
    Note over API,DB: COMMIT LOCAL DB TRANSACTION
    API-->>Parent: 200 OK {"status": "taken"}
    deactivate API

    activate Outbox
    Outbox->>DB: Poll / Read pending OutboxEvent
    Outbox->>Bus: Publish DomainEvent('medication_taken')
    Outbox->>DB: UPDATE outbox_events SET status='published'
    deactivate Outbox

    par Event Consumers
        Bus->>Notif: Handle medication_taken
        Notif->>Coord: Dispatch Push Notification ("Dad took morning dose")
    and
        Bus->>Redis: Invalidate Cache Keys (parent.home, coordinator.home)
    and
        Bus->>Redis: Publish WebSocket Invalidation Directive
        Redis-->>Coord: WS Frame: {"action": "invalidate", "affected_projections": ["home", "medications"]}
    end
```

### Distributed Sagas & Compensating Actions
To ensure resilience without 2-Phase Commit (2PC) across PostgreSQL, FHIR, FileNest, and Notification providers:
1. Core state and outbox events commit in a **Local DB Transaction**.
2. Asynchronous workers attempt downstream delivery with exponential backoff (up to 5 retries).
3. If an external system rejects the payload permanently (e.g. invalid FHIR schema), [`CompensatingActionEngine`](file:///d:/Kalyan/kinguardian-platform/platform/kinguardian-backend/app/core/transaction_boundary/saga.py) executes compensation logic, transitions the entity to `sync_failed`, logs `audit.compensating_action_executed`, and marks the outbox event as `compensated_failure`.

---

## 6. Database Schema & Multi-Tenancy Architecture

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ FAMILIES : "contains"
    APP_PROFILES ||--o{ FAMILY_MEMBERSHIPS : "joins"
    FAMILIES ||--|{ FAMILY_MEMBERSHIPS : "includes"
    FAMILIES ||--|{ CARE_SUBJECTS : "enrolls"
    APP_PROFILES ||--o{ CARE_SUBJECTS : "links profile"
    FAMILIES ||--o{ CARE_TASKS : "tracks"
    FAMILIES ||--o{ CONSENTS : "governs"
    CARE_SUBJECTS ||--o{ MEDICATION_ADHERENCE_EVENTS : "schedules"
    CARE_SUBJECTS ||--o{ WELLBEING_CHECKINS : "logs"
    CARE_SUBJECTS ||--o{ AI_INSIGHTS : "receives"
    CARE_SUBJECTS ||--o{ HEALTH_DOCUMENTS : "stores"
    FAMILIES ||--o{ EVENT_LOGS : "audits (partitioned)"
    FAMILIES ||--o{ NOTIFICATIONS : "delivers (partitioned)"
    FAMILIES ||--o{ OUTBOX_EVENTS : "dispatches (partitioned)"

    ORGANIZATIONS {
        uuid id PK
        string name
        string slug UK
        string status
    }
    FAMILIES {
        uuid id PK
        uuid organization_id FK
        string name
        uuid primary_coordinator_profile_id FK
        datetime created_at
    }
    FAMILY_MEMBERSHIPS {
        uuid id PK
        uuid family_id FK
        uuid profile_id FK
        string membership_role
        string status
    }
    CARE_SUBJECTS {
        uuid id PK
        uuid family_id FK
        uuid profile_id FK
        string fhir_patient_id
        string relationship_to_coordinator
    }
    CONSENTS {
        uuid id PK
        uuid family_id FK
        uuid subject_id FK
        uuid grantor_profile_id FK
        uuid grantee_profile_id FK
        string consent_type
        json scope
        string status
    }
    MEDICATION_ADHERENCE_EVENTS {
        uuid id PK
        uuid subject_id FK
        string fhir_medication_request_id
        datetime scheduled_at
        string status
        datetime confirmed_at
    }
    EVENT_LOGS {
        uuid id PK
        uuid family_id FK
        string event_type
        string aggregate_type
        string aggregate_id
        json payload
        datetime utc_timestamp
    }
```

### High-Volume Monthly Range Table Partitioning
The following append-only tables are partitioned monthly by timestamp (`TablePartitionManager`):
- `event_logs`
- `outbox_events`
- `notifications` & `notification_deliveries`
- `medication_adherence_events`
- `wellbeing_checkins`

---

## 7. Authorization Model & Capabilities Matrix

KinGuardian enforces a 2-tier security model: **RBAC Role Capabilities** + **Explicit Consent Grants**.

```mermaid
flowchart TD
    REQ["API Request"] --> R_CHECK{"Is Caller Member of Family Circle?"}
    R_CHECK -- No --> DENY_403["403 Forbidden"]
    R_CHECK -- Yes --> ROLE_CAP{"Does Caller's Role Have Required Capability?"}
    ROLE_CAP -- No --> DENY_403
    ROLE_CAP -- Yes --> CLIN_CHECK{"Is Requested Resource Clinical Data?"}
    CLIN_CHECK -- No --> ALLOW["Allow Request"]
    CLIN_CHECK -- Yes --> CONS_CHECK{"Is Requester the Subject Themselves?"}
    CONS_CHECK -- Yes --> ALLOW
    CONS_CHECK -- No --> SCOPE_CHECK{"Is Active Consent Scope Granted?"}
    SCOPE_CHECK -- Yes --> ALLOW
    SCOPE_CHECK -- No --> BREAK_GLASS{"Is Break-Glass Emergency Active?"}
    BREAK_GLASS -- Yes --> ALLOW_AUDIT["Allow with Critical Audit Log"]
    BREAK_GLASS -- No --> DENY_403
```

### Role Capabilities Matrix

| Capability Name | Primary Coordinator | Care Coordinator | Aging Parent | Family Member / Viewer |
| :--- | :---: | :---: | :---: | :---: |
| `manage_circle` | ✅ | ❌ | ❌ | ❌ |
| `invite_members` | ✅ | ✅ | ❌ | ❌ |
| `assign_care_tasks` | ✅ | ✅ | ❌ | ❌ |
| `view_timeline` | ✅ | ✅ | ✅ | ✅ (Consented) |
| `log_wellbeing_checkin` | ✅ | ✅ | ✅ | ❌ |
| `confirm_medication` | ✅ | ✅ | ✅ | ❌ |
| `grant_revoke_consent` | ❌ | ❌ | ✅ | ❌ |
| `view_clinical_vitals` | ✅ (Consented) | ✅ (Consented) | ✅ | ❌ |
| `execute_ai_agent` | ✅ | ✅ | ✅ | ❌ |

---

## 8. Multi-Channel Notification Architecture

```mermaid
flowchart TD
    EVENT["Domain Event (e.g. medication_missed)"] --> POLICY["1. Notification Policy Engine<br/>• Urgency Classification (P0, P1, P2, P3)<br/>• Recipient Preference Evaluation<br/>• Quiet Hours & Timezone Rules"]
    
    POLICY --> ROUTE{"2. Channel Router"}
    
    ROUTE -->|P0 Critical / Urgent| CH_PUSH["Push Notification (FCM / APNs)"]
    ROUTE -->|P0 Critical Escalation| CH_SMS["SMS Fallback (Twilio)"]
    ROUTE -->|Daily Reminders & Checkins| CH_WA["WhatsApp Cloud Interactive"]
    ROUTE -->|Weekly Health Summaries| CH_EMAIL["Email (SendGrid)"]
    ROUTE -->|In-App Feed| CH_INAPP["In-App Alert Center"]
    
    CH_PUSH --> DELIV["3. Delivery Tracker & Retry Engine"]
    CH_SMS --> DELIV
    CH_WA --> DELIV
    CH_EMAIL --> DELIV
    CH_INAPP --> DELIV

    DELIV -->|Failure / Rate Limit| PERSIST["Persist Intent in DB (status='pending_retry')<br/>Exponential Backoff Worker"]
```

### Urgency Classification & SLA Matrix
- **`P0 - Emergency / Critical`**: Severe vital anomaly, missed critical cardiac medication, fall detected.
  - *Channels*: High-priority Push + Immediate SMS + WhatsApp alert.
  - *SLA*: $< 10\text{s}$ dispatch, bypasses Quiet Hours.
- **`P1 - Urgent Action`**: Daily check-in missed by 2 hours, care task overdue.
  - *Channels*: Push notification + In-App banner.
  - *SLA*: $< 60\text{s}$ dispatch, respects Quiet Hours unless overridden.
- **`P2 - Informational`**: Daily Guardian Moment generated, vitals within normal range.
  - *Channels*: In-App badge + Standard Push.
- **`P3 - Low Priority`**: Weekly care digest, tips, system maintenance notice.
  - *Channels*: Email + In-App notification feed.
