# Middle Layer Architecture — Business Logic, Authorization & Workflow

> The FHIR server is a data plane. This document designs the **control plane** — the middle layer that sits between API consumers (UI, mobile apps, AI agents, EHR integrations) and the FHIR data layer, implementing all clinical business rules, authorization policies, and workflow orchestration.

---

## Why a Separate Middle Layer

The FHIR server's own description says it clearly: *"Pure CRUD data layer — no auth, no business rules."*

Putting business logic inside the FHIR data layer would:
1. Couple domain rules to persistence — hard to test, hard to change
2. Pollute the FHIR namespace with non-FHIR concepts
3. Prevent multiple surfaces (web, mobile, AI agent, HL7v2 adapter) from sharing the same rules
4. Block replacement of the data layer (e.g., migrating from PostgreSQL to Medplum) without rewriting clinical logic

The middle layer is a **separate service** (also FastAPI/Python to share the team's skills) that:
- Receives all requests from consumers
- Validates authorization and applies business rules
- Translates high-level clinical intent into FHIR resource operations
- Orchestrates multi-resource workflows
- Emits audit events and notifications
- Proxies FHIR reads/writes to the data layer

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          API Consumers                               │
│  Web UI    Mobile App    AI Agent (MCP)    HL7v2 Feed    EHR SMART  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS / mTLS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Gateway / Reverse Proxy                        │
│  (nginx / Kong / AWS API Gateway)                                    │
│  • TLS termination  • Rate limiting (outer)  • WAF  • mTLS verify   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              IAM / Auth Server  (OAuth2 + OIDC + SMART)              │
│  • SMART App Launch v2  • PKCE  • Scope issuance                    │
│  • JWKS endpoint  • Token introspection  • .well-known              │
└────────────┬────────────────────────────────────────────────────────┘
             │ JWKS (public keys for JWT verification)
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     MIDDLE LAYER (Pulse Orchestrator)                │
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │  Auth Middleware │   │  Business Rules  │   │  Workflow Eng  │   │
│  │  • JWT validate  │   │  • RBAC guard    │   │  • State mach. │   │
│  │  • SMART scopes  │   │  • ABAC policies │   │  • Saga coord  │   │
│  │  • Session mgmt  │   │  • Consent check │   │  • CDS Hooks   │   │
│  └────────┬────────┘   └────────┬─────────┘   └───────┬────────┘   │
│           │                     │                       │            │
│  ┌────────▼─────────────────────▼───────────────────────▼────────┐  │
│  │              Service Orchestration Layer                        │  │
│  │  • AppointmentOrchestrator  • EncounterOrchestrator            │  │
│  │  • PrescriptionOrchestrator • DischargeOrchestrator            │  │
│  │  • ReferralOrchestrator     • LabResultOrchestrator            │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
│                             │                                         │
│  ┌──────────────────────────▼─────────────────────────────────────┐  │
│  │              FHIR Client (httpx async)                          │  │
│  │  • Bundles atomic operations into transactions                  │  │
│  │  • Emits AuditEvent on every read/write                        │  │
│  │  • Injects provenance on writes                                 │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Internal mTLS (not public)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FHIR DATA LAYER (this server)                    │
│  FastAPI + SQLAlchemy + PostgreSQL + Redis + Terminology            │
│  /api/fhir/v1/*   /api/v1/terminology   /api/v1/vitals             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
          PostgreSQL 15    Redis 7    Terminology DB
          (encrypted)    (encrypted)  (SNOMED/LOINC/RxNorm)
```

---

## Middle Layer Components

### 1. Auth Middleware

Every request enters through the auth middleware chain:

```
Request
  │
  ├── extract_jwt()           Read Bearer token from Authorization header
  │
  ├── validate_jwt()          Verify signature (JWKS), iss, aud, exp
  │
  ├── extract_claims()        sub, activeOrganizationId, roles[], scopes[]
  │
  ├── build_auth_context()    AuthContext { user_id, org_id, roles, scopes, ... }
  │
  ├── scope_guard()           Reject if required SMART scope absent
  │
  ├── rate_limit()            Per-user Redis sliding window
  │
  └── inject_to_state()       request.state.auth_context = ctx
```

**AuthContext dataclass:**
```python
@dataclass
class AuthContext:
    user_id: str          # JWT sub
    org_id: str           # activeOrganizationId
    roles: list[str]      # roles extracted from JWT claims (claim name configurable)
    scopes: set[str]      # SMART v2 scopes (patient/*.cruds, user/*.rs, etc.)
    is_system: bool       # client_credentials grant (backend service)
    patient_id: str | None  # SMART launch/patient context
    session_id: str | None  # server-side session (web clients)
```

---

### 2. RBAC Guard

Role → Resource → Action matrix enforced before any business logic runs.

```python
ROLE_PERMISSIONS: dict[str, dict[str, set[str]]] = {
    "physician": {
        "Patient":           {"read", "write"},
        "MedicationRequest": {"read", "write", "sign"},
        "Encounter":         {"read", "write", "close"},
        "Observation":       {"read", "write"},
        "DiagnosticReport":  {"read", "write"},
        "ServiceRequest":    {"read", "write", "sign"},
        ...
    },
    "nurse": {
        "Patient":           {"read"},
        "MedicationRequest": {"read", "administer"},  # cannot prescribe
        "Encounter":         {"read", "write"},
        "Observation":       {"read", "write"},
        "VitalSigns":        {"read", "write"},
        ...
    },
    "billing_clerk": {
        "Claim":             {"read", "write"},
        "Coverage":          {"read"},
        "Invoice":           {"read", "write"},
        "Patient":           {"read"},  # demographics only
        ...
    },
    "patient": {
        "Patient":           {"read"},  # own record only (enforced separately)
        "Appointment":       {"read", "request"},
        "MedicationRequest": {"read"},
        "AllergyIntolerance": {"read"},
        ...
    },
    "admin": {
        "*": {"read", "write", "delete"},  # org admin — full access in org
    },
}
```

The guard is a FastAPI dependency:
```python
async def require_role_action(
    resource: str,
    action: str,
    auth: AuthContext = Depends(get_auth_context),
) -> None:
    for role in auth.roles:
        perms = ROLE_PERMISSIONS.get(role, {})
        allowed = perms.get(resource, perms.get("*", set()))
        if action in allowed:
            return
    raise PermissionDeniedError(f"Role(s) {auth.roles} cannot {action} {resource}")
```

---

### 3. ABAC Policies

Attribute-based access checks that layer on top of RBAC — they evaluate contextual attributes that RBAC cannot express statically.

**Key ABAC policies:**

| Policy | Trigger | Logic |
|---|---|---|
| `care_team_membership` | Reading another patient's record | Check if practitioner is in patient's CareTeam |
| `own_record_only` | Patient role accessing data | `resource.patient_id == auth.patient_id` |
| `vip_record_gate` | Patient has `meta.security = VIP` | Require explicit VIP access role |
| `sensitive_category_gate` | Resource has sensitivity label (mental health, substance use, reproductive) | Check sensitivity-specific role |
| `consent_check` | Patient has FHIR Consent that restricts access | Evaluate Consent permit/deny rules |
| `temporal_access` | Time-limited delegation (covering physician) | Check validity window |

```python
class ABACEngine:
    async def evaluate(
        self,
        action: str,
        resource: FHIRResource,
        context: AuthContext,
        fhir_client: FHIRClient,
    ) -> AccessDecision:
        policies = self._policies_for(action, resource.resource_type)
        results = await asyncio.gather(*[p.evaluate(resource, context, fhir_client) for p in policies])
        if all(r.permitted for r in results):
            return AccessDecision.PERMIT
        denying = [r for r in results if not r.permitted]
        # Check if break-glass overrides any denial
        if context.has_break_glass and all(r.overridable for r in denying):
            return AccessDecision.PERMIT_WITH_AUDIT_ESCALATION
        return AccessDecision.DENY
```

---

### 4. Workflow Authorization

Beyond RBAC/ABAC, clinical **state transitions** require authorization:

```python
# Appointment workflow
APPOINTMENT_TRANSITIONS: dict[str, dict[str, list[str]]] = {
    "proposed":   {"booked": ["physician", "nurse", "scheduler"], "cancelled": ["physician", "nurse", "patient", "scheduler"]},
    "booked":     {"arrived": ["nurse", "scheduler"], "cancelled": ["physician", "nurse", "patient"]},
    "arrived":    {"fulfilled": ["physician", "nurse"], "noshow": ["scheduler"]},
    "in-waitlist": {"booked": ["scheduler"]},
}

class AppointmentWorkflowGuard:
    def check_transition(self, from_status: str, to_status: str, roles: list[str]) -> None:
        allowed_roles = APPOINTMENT_TRANSITIONS.get(from_status, {}).get(to_status, [])
        if not any(role in allowed_roles for role in roles):
            raise WorkflowTransitionDeniedError(
                f"Transition {from_status} → {to_status} requires one of {allowed_roles}"
            )

# Encounter workflow
ENCOUNTER_TRANSITIONS = {
    "planned":      {"arrived": ["nurse"], "cancelled": ["physician", "admin"]},
    "arrived":      {"in-progress": ["physician", "nurse"]},
    "in-progress":  {"onleave": ["nurse"], "finished": ["physician"]},
    "onleave":      {"in-progress": ["nurse", "physician"]},
    "finished":     {},  # terminal state
    "cancelled":    {},  # terminal state
}

# MedicationRequest workflow
MEDICATION_REQUEST_TRANSITIONS = {
    "draft":     {"active": ["physician"], "cancelled": ["physician"]},
    "active":    {"on-hold": ["physician"], "completed": ["nurse", "physician"], "stopped": ["physician"]},
    "on-hold":   {"active": ["physician"], "cancelled": ["physician"]},
    "completed": {},  # terminal
    "stopped":   {},  # terminal
}
```

---

### 5. Service Orchestrators

Each clinical domain has an orchestrator that handles multi-step workflows:

#### AppointmentOrchestrator
```
book_appointment(patient_id, slot_id, service_type, reason):
  1. validate_slot_availability(slot_id)          → check slot.status == "free"
  2. check_patient_eligibility(patient_id)        → active patient, no conflicting appt
  3. check_practitioner_availability(slot)        → schedule not overridden
  4. check_service_requirements(service_type)     → referral needed? prior auth needed?
  5. apply_booking_rules(slot, patient, service)  → same-day rules, lead time, etc.
  6. [FHIR] PATCH Slot: status=busy
  7. [FHIR] POST Appointment: status=booked, with all references
  8. emit_audit_event(action=appointment.booked)
  9. notify_patient(appointment)
  10. notify_practitioner(appointment)
  11. return appointment
```

#### EncounterOrchestrator
```
admit_patient(patient_id, encounter_type, location, practitioner):
  1. validate_patient_active(patient_id)
  2. check_bed_availability(location)
  3. check_practitioner_admitting_privileges(practitioner, location)
  4. [FHIR TRANSACTION BUNDLE]:
     - POST Encounter (status=arrived)
     - PATCH Patient location/managingOrganization if first encounter
     - POST EpisodeOfCare if needed
     - POST Coverage verification ServiceRequest if needed
  5. emit_audit_event(action=encounter.admitted)
  6. trigger_admission_checklist(encounter_id)
  7. return encounter

discharge_patient(encounter_id, discharge_disposition):
  1. validate_encounter_in_progress(encounter_id)
  2. check_pending_orders(encounter_id)           → warn if unsigned orders
  3. check_pending_results(encounter_id)          → warn if unreviewed results
  4. [FHIR TRANSACTION BUNDLE]:
     - PATCH Encounter: status=finished, period.end=now, hospitalization.dischargeDisposition
     - POST DocumentReference: discharge summary
     - PATCH EpisodeOfCare if applicable
     - POST CarePlan: follow-up plan
  5. emit_audit_event(action=encounter.discharged)
  6. schedule_followup_tasks(patient_id, encounter_id)
  7. notify_payer(encounter_id)                   → trigger claim workflow
```

#### PrescriptionOrchestrator
```
prescribe(patient_id, medication, dose, route, frequency, prescriber_id):
  1. check_prescriber_dea_authority(prescriber_id, medication)
  2. check_allergy_conflicts(patient_id, medication)
  3. check_drug_drug_interactions(patient_id, medication)
  4. check_dose_range(medication, dose, patient_weight)
  5. check_formulary_coverage(patient_id, medication)
  6. check_prior_auth_required(patient_id, medication, coverage)
  7. [FHIR] POST MedicationRequest: status=active
  8. emit_audit_event(action=medication.prescribed)
  9. route_to_pharmacy(medication_request_id)
  10. return medication_request
```

#### LabResultOrchestrator
```
receive_result(diagnostic_report, observations):
  1. match_to_order(diagnostic_report.basedOn)
  2. flag_critical_values(observations)          → any outside reference range?
  3. [FHIR TRANSACTION BUNDLE]:
     - POST DiagnosticReport: status=final
     - POST Observation[] (each result)
     - PATCH ServiceRequest: status=completed
  4. route_to_ordering_provider(diagnostic_report)
  5. if critical: urgent_notification(provider_id)
  6. if patient_access_allowed: notify_patient()
  7. emit_audit_event(action=result.received)
```

---

### 6. FHIR Transaction Client

The middle layer communicates with the data layer via a typed async FHIR client that wraps `httpx`:

```python
class FHIRClient:
    def __init__(self, base_url: str, service_token: str):
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {service_token}"},
            verify=True,
        )

    async def transaction(self, bundle: Bundle) -> Bundle:
        """POST a transaction Bundle — atomic multi-resource operation."""
        resp = await self.client.post("/", json=bundle.model_dump())
        resp.raise_for_status()
        return Bundle.model_validate(resp.json())

    async def get_patient_everything(self, patient_id: int) -> Bundle:
        resp = await self.client.get(f"/patients/{patient_id}/$everything")
        resp.raise_for_status()
        return Bundle.model_validate(resp.json())

    async def emit_audit_event(self, event: AuditEventCreate) -> None:
        await self.client.post("/audit-events", json=event.model_dump())

    async def search(
        self,
        resource_type: str,
        params: dict,
    ) -> Bundle:
        resp = await self.client.get(f"/{resource_type.lower()}s", params=params)
        resp.raise_for_status()
        return Bundle.model_validate(resp.json())
```

---

### 7. AuditEvent Auto-Emission

Every FHIR operation that touches PHI must produce an AuditEvent. This is implemented as middleware in the middle layer that wraps every outbound FHIR Client call:

```python
class AuditingFHIRClient(FHIRClient):
    async def get(self, path: str, **kwargs) -> Response:
        resp = await super().get(path, **kwargs)
        await self._emit(action="read", path=path, status=resp.status_code)
        return resp

    async def post(self, path: str, body: dict, **kwargs) -> Response:
        resp = await super().post(path, body, **kwargs)
        await self._emit(action="create", path=path, status=resp.status_code, body=body)
        return resp

    async def _emit(self, action: str, path: str, status: int, body: dict = None):
        event = AuditEventCreate(
            type=AuditEventType.REST,
            action=action,
            recorded=datetime.utcnow().isoformat(),
            outcome="0" if status < 400 else "8",
            agent=[{
                "who": {"reference": f"Practitioner/{self.auth_context.user_id}"},
                "requestor": True,
                "network": {"address": self.auth_context.client_ip},
            }],
            source={"observer": {"reference": "Device/pulse-orchestrator"}},
            entity=[{"what": {"reference": path}, "role": {"code": "4"}}],
        )
        # Fire-and-forget to avoid blocking the response path
        asyncio.create_task(self._post_audit(event))
```

---

### 8. CDS Hooks Service

Pluggable clinical decision support, called inline by orchestrators:

```python
class CDSHooksService:
    async def patient_view(self, patient_id: str, user_id: str) -> list[Card]:
        """Called when a practitioner opens a patient chart."""
        cards = []
        cards.extend(await self._check_overdue_preventive_care(patient_id))
        cards.extend(await self._check_care_gaps(patient_id))
        cards.extend(await self._check_active_alerts(patient_id))
        return cards

    async def order_sign(self, medication_request: MedicationRequest, patient_id: str) -> list[Card]:
        """Called before a prescription is signed."""
        cards = []
        cards.extend(await self._drug_drug_interaction_check(medication_request, patient_id))
        cards.extend(await self._allergy_check(medication_request, patient_id))
        cards.extend(await self._dose_range_check(medication_request, patient_id))
        cards.extend(await self._formulary_check(medication_request, patient_id))
        return cards

    async def order_select(self, order: ServiceRequest, patient_id: str) -> list[Card]:
        """Called when a lab/imaging order is selected."""
        cards = []
        cards.extend(await self._duplicate_order_check(order, patient_id))
        cards.extend(await self._prior_auth_required_check(order, patient_id))
        return cards
```

---

### 9. Break-Glass Access

```python
class BreakGlassService:
    async def request_emergency_access(
        self,
        requester: AuthContext,
        patient_id: int,
        reason: str,
        duration_minutes: int = 60,
    ) -> BreakGlassToken:
        if not reason or len(reason) < 20:
            raise ValueError("Break-glass reason must be descriptive (≥20 chars)")

        token = BreakGlassToken(
            requester_id=requester.user_id,
            patient_id=patient_id,
            reason=reason,
            granted_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=duration_minutes),
        )
        await self.redis.setex(
            f"break_glass:{requester.user_id}:{patient_id}",
            duration_minutes * 60,
            token.model_dump_json(),
        )

        # Critical audit — always synchronous, never fire-and-forget
        await self.fhir_client.post("/audit-events", body=AuditEventCreate(
            type=AuditEventType.SECURITY_ALERT,
            action="execute",
            outcome="0",
            outcomeDesc=f"Break-glass access granted. Reason: {reason}",
            ...
        ).model_dump())

        # Supervisor notification
        await self.notification_service.alert_supervisors(
            f"{requester.user_id} used break-glass access for patient {patient_id}. Reason: {reason}"
        )

        return token
```

---

### 10. Middle Layer Directory Layout

```
pulse/                           (middle layer service)
├── main.py                      (FastAPI app, middleware chain)
├── auth/
│   ├── middleware.py            (JWT validation, AuthContext builder)
│   ├── smart.py                 (SMART scope extraction + guard)
│   ├── rbac.py                  (role → resource → action matrix)
│   ├── abac.py                  (policy engine)
│   └── break_glass.py           (emergency access pattern)
├── workflows/
│   ├── appointment.py           (AppointmentOrchestrator)
│   ├── encounter.py             (EncounterOrchestrator)
│   ├── prescription.py          (PrescriptionOrchestrator)
│   ├── discharge.py             (DischargeOrchestrator)
│   ├── lab_results.py           (LabResultOrchestrator)
│   └── referral.py              (ReferralOrchestrator)
├── guards/
│   ├── transition.py            (WorkflowTransitionGuard)
│   ├── clinical_rules.py        (domain-specific validation)
│   └── consent.py               (FHIR Consent evaluator)
├── cds/
│   ├── hooks.py                 (CDS Hooks dispatcher)
│   ├── drug_interactions.py     
│   ├── allergy_check.py         
│   └── prior_auth.py            
├── fhir_client/
│   ├── client.py                (FHIRClient, AuditingFHIRClient)
│   ├── transaction.py           (Bundle builder)
│   └── audit.py                 (AuditEvent builder)
├── notifications/
│   ├── service.py               (email, SMS, push, in-app)
│   └── routing.py               (result routing, inbox management)
├── routers/
│   ├── appointments.py          (high-level booking API)
│   ├── encounters.py            (admission/discharge API)
│   ├── prescriptions.py         
│   └── fhir_proxy.py            (pass-through for direct FHIR access)
├── schemas/
│   └── ...                      (Pydantic models for middle-layer APIs)
└── core/
    ├── config.py                (full 12-factor config)
    ├── logging.py               (OTel + structured JSON)
    └── metrics.py               (Prometheus)
```

---

## Communication Contracts

### Middle Layer → FHIR Server

- Transport: Internal HTTPS with mutual TLS (mTLS)
- Auth: Service account JWT (`client_credentials` grant, RFC 7523 private_key_jwt) with `system/*.cruds` scope
- Format: `application/fhir+json` for FHIR operations, `application/json` for plain operations
- Audit: Middle layer is responsible for emitting AuditEvent — FHIR server just stores them

### Consumer → Middle Layer

- Transport: HTTPS with TLS 1.3
- Auth: SMART on FHIR Bearer JWT (user-context or system-context)
- Format: Both `application/fhir+json` and `application/json` supported
- Rate limiting: Per-user per-endpoint at the API gateway

### Notifications

- Email: SES / SendGrid (BAA required)
- SMS: Twilio / SNS (BAA required)
- In-app: WebSocket channels or server-sent events
- Pager/STAT: PagerDuty or equivalent for critical alerts
