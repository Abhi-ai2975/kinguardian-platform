# Authorization & Workflow Authorization Design

> Complete design for: SMART on FHIR scope enforcement, RBAC, ABAC, workflow authorization, consent, break-glass, and data-layer row-security.

---

## 1. Authorization Layers

Clinical authorization is not a single check — it is a **stack of layers** that must all pass:

```
Request arrives
   │
   ├── Layer 1: Transport / Network         Is this request coming from an allowed network?
   │
   ├── Layer 2: Authentication              Is the JWT valid, non-expired, from our IAM?
   │
   ├── Layer 3: SMART Scope                 Does the JWT carry the required resource+action scope?
   │
   ├── Layer 4: RBAC                        Does the user's role permit this resource+action?
   │
   ├── Layer 5: Workflow State              Is the requested state transition legal right now?
   │
   ├── Layer 6: ABAC / Context              Does context (care team, sensitivity, consent) allow it?
   │
   └── Layer 7: Data-layer tenancy          Does the row belong to this org/user? (FHIR server)
```

Failing any layer returns 401/403 with an OperationOutcome. Layers are checked cheapest-first (network → JWT → scope → RBAC before touching the database).

---

## 2. IAM / Auth Server Contract

The authorization design is IAM-agnostic. Any OAuth2 + OIDC compliant IAM satisfies the contract as long as the tokens it issues contain the required claims. See `doc 08 §1` for the full IAM contract.

### Required JWT Claims

```json
{
  "sub": "user-uuid",
  "iss": "https://your-iam.example.com",
  "aud": "fhir-server",
  "exp": 1800000000,
  "iat": 1799996400,
  "scope": "openid patient/Patient.r patient/Observation.rs",
  "roles": ["physician"],
  "activeOrganizationId": "org-uuid",
  "launch_response": {
    "patient": "10001"
  },
  "fhirUser": "Practitioner/30001"
}
```

### Responsibility Split

| Concern | IAM | Pulse | FHIR Server |
|---|---|---|---|
| User authentication (password, MFA, SSO, OAuth providers) | ✓ | — | — |
| Token issuance + signing | ✓ | — | — |
| PKCE validation | ✓ | — | — |
| SMART scope registration | ✓ | — | — |
| JWT signature verification | — | ✓ via JWKS | — |
| SMART scope enforcement | — | ✓ | — |
| RBAC (role → resource → action) | — | ✓ | — |
| ABAC (care team, consent, sensitivity) | — | ✓ | — |
| Row-level tenancy (user_id + org_id filter) | — | — | ✓ reads from claims |

### Client Types Required

| Client | Grant | Auth Method |
|---|---|---|
| Clinician web / mobile | `authorization_code` | PKCE (S256) |
| Pulse orchestrator | `client_credentials` | `private_key_jwt` (RFC 7523) |
| AI gateway agents | `client_credentials` | `private_key_jwt` (RFC 7523) |
| Patient portal | `authorization_code` | PKCE (S256) |
| Third-party SMART apps | `authorization_code` | PKCE (S256) |

---

## 3. SMART on FHIR Scopes

### Scope Grammar (SMART v2)

```
<context>/<ResourceType>.<actions>

context:  patient | user | system
actions:  c=create, r=read, u=update, d=delete, s=search (any combination)

Examples:
  patient/Observation.rs       read+search patient-contexted observations
  user/MedicationRequest.cruds full CRUD on medication requests for user context
  system/*.rs                  read+search all resources (backend service)
```

### Scope Enforcement Middleware

```python
RESOURCE_SCOPE_MAP = {
    ("Patient", "read"):           {"patient/Patient.r", "user/Patient.r", "system/Patient.r"},
    ("Patient", "search"):         {"patient/Patient.s", "user/Patient.s", "system/Patient.s"},
    ("Patient", "write"):          {"user/Patient.cud", "system/Patient.cud"},
    ("Observation", "read"):       {"patient/Observation.r", "user/Observation.r"},
    ("Observation", "search"):     {"patient/Observation.s", "user/Observation.s"},
    ("MedicationRequest", "read"): {"patient/MedicationRequest.r", "user/MedicationRequest.r"},
    ("MedicationRequest", "write"):{"user/MedicationRequest.cu", "system/MedicationRequest.cud"},
    # ... complete matrix for all 34 resources
}

def require_scope(resource_type: str, action: str):
    """FastAPI dependency — raises 403 if required scope absent."""
    async def _check(auth: AuthContext = Depends(get_auth_context)):
        required = RESOURCE_SCOPE_MAP.get((resource_type, action), set())
        if not required.intersection(auth.scopes):
            raise HTTPException(
                status_code=403,
                detail={
                    "resourceType": "OperationOutcome",
                    "issue": [{
                        "severity": "error",
                        "code": "forbidden",
                        "diagnostics": f"Scope {required} required for {action} on {resource_type}"
                    }]
                }
            )
    return _check
```

---

## 4. RBAC Design

### Role Hierarchy

```
system_admin
    └── org_admin
            ├── physician
            │     └── resident (physician with cosign required flag)
            ├── nurse
            │     └── lpn (licensed practical nurse — subset of RN)
            ├── pharmacist
            ├── lab_technician
            ├── radiologist
            ├── therapist
            ├── social_worker
            ├── case_manager
            ├── billing_clerk
            ├── scheduler
            ├── receptionist
            └── patient
                  └── related_person (proxy access)
```

### Permission Matrix (condensed)

| Resource | physician | nurse | pharmacist | lab_tech | billing | patient |
|---|---|---|---|---|---|---|
| Patient | CRUD | R | R | R | R (demographics) | R (own) |
| Encounter | CRUD + close | CRUD | R | R | R | R (own) |
| MedicationRequest | CRUD + sign | R + administer | R + dispense | — | R | R (own) |
| Observation | CRUD | CRUD | R | CRUD | — | R (own) |
| DiagnosticReport | CRUD | R | R | CRUD | — | R (own) |
| Condition | CRUD | R | R | — | R (dx codes) | R (own) |
| AllergyIntolerance | CRUD | CRUD | R | — | — | R (own) |
| Claim | R | — | — | — | CRUD | R (own) |
| Coverage | R | R | R | — | CRUD | R (own) |
| Invoice | R | — | — | — | CRUD | R (own) |
| Schedule | R | R | — | — | — | R |
| Slot | R | CRUD | — | — | — | R |
| Appointment | CRUD | CRUD | — | — | R | R + request |
| ServiceRequest | CRUD + sign | R + collect | — | R + fulfill | R | R (own) |
| AuditEvent | R (own org) | — | — | — | — | — |
| Provenance | R | — | — | — | — | — |

> `CRUD` = Create + Read + Update + Delete  
> `R` = Read only  
> `sign` = Custom action — marks resource as authorized by a licensed provider

---

## 5. Workflow Authorization — State Machine Definitions

### Appointment State Machine

```
                    ┌─────────┐
              ┌────►│proposed │◄────────────────────┐
              │     └────┬────┘                     │
              │          │ book [scheduler/nurse]    │
              │          ▼                           │ re-open [admin]
              │     ┌─────────┐                     │
              │     │ booked  │─────────────────────┘
              │     └────┬────┘
              │          │ arrive [nurse/scheduler]
              │          ▼
              │     ┌─────────┐
              │     │ arrived │
              │     └────┬────┘
              │          │ start [physician/nurse]
              │          ▼
              │     ┌──────────────┐
              │     │  in-progress │
              │     └──────┬───────┘
              │            │ complete [physician]
              │            ▼
              │     ┌──────────┐
              │     │fulfilled │  (terminal)
              │     └──────────┘
              │
              └─── cancel [patient/nurse/physician/scheduler] (any non-terminal state)
                   noshow  [scheduler] (from arrived only)
```

### Encounter State Machine

```
planned ──[nurse/scheduler]──► arrived ──[physician/nurse]──► in-progress
                                                                    │
                                              ┌─────────────────────┤
                                              │                     │
                                        on-leave              finished (terminal)
                                              │    [physician]
                                              └──────────────►
```

### ServiceRequest (Lab Order) State Machine

```
draft ──[physician/sign]──► active ──[lab_tech/accept]──► received
                                                               │
                                            ──[lab_tech/process]──► in-progress
                                                               │
                                            ──[lab_tech/result]──► completed (terminal)
                                            ──[physician/cancel]──► revoked (terminal)
```

### MedicationRequest State Machine

```
draft ──[physician/sign]──► active ──[pharmacist/dispense]──► on-hold? ──► completed
                               │                                             (terminal)
                               ├──[physician/hold]──► on-hold ──[physician]──► active
                               └──[physician/stop]──► stopped (terminal)
```

---

## 6. Consent Enforcement

### FHIR Consent Evaluation

```python
class ConsentEvaluator:
    async def evaluate(
        self,
        patient_id: int,
        requester: AuthContext,
        resource_type: str,
        action: str,
    ) -> ConsentDecision:
        # Load all active Consents for this patient
        consents = await self.fhir_client.search("Consent", {
            "patient": f"Patient/{patient_id}",
            "status": "active",
        })

        for consent in consents.entries:
            c = consent.resource

            # Check if this consent provision covers the requested action
            provision = self._match_provision(c, resource_type, action, requester)
            if provision is None:
                continue

            if provision.type == "deny":
                # Explicit deny — check if break-glass is in effect
                if requester.has_break_glass_for(patient_id):
                    return ConsentDecision(
                        permitted=True,
                        requires_escalated_audit=True,
                        override_reason="break_glass",
                    )
                return ConsentDecision(
                    permitted=False,
                    denial_reason=f"Consent {c.id} denies {action} on {resource_type}",
                )

            if provision.type == "permit":
                return ConsentDecision(permitted=True)

        # No matching provision — default permit (opt-out model)
        # For opt-in model, return ConsentDecision(permitted=False)
        return ConsentDecision(permitted=True)
```

### Sensitive Category Handling

HIPAA and 42 CFR Part 2 impose heightened restrictions on:
- Mental/behavioral health records
- Substance use disorder treatment
- HIV/AIDS records
- Reproductive health
- Sexual assault records
- Genetic information

These are flagged using FHIR `meta.security` with codes from `http://terminology.hl7.org/CodeSystem/v3-ActCode`:
- `PSY` — psychiatry/mental health
- `ETH` — substance abuse / 42 CFR Part 2
- `HIV` — HIV/AIDS
- `SDV` — sexual assault / domestic violence
- `SEX` — reproductive health

```python
SENSITIVE_CATEGORY_ROLES = {
    "PSY": {"mental_health_provider", "psychiatrist", "psychologist", "physician", "admin"},
    "ETH": {"substance_use_provider", "physician", "admin"},  # 42 CFR Part 2 — stricter
    "HIV": {"physician", "nurse", "admin"},
    "SDV": {"physician", "social_worker", "admin"},
}

async def check_sensitivity_gate(resource: FHIRResource, requester: AuthContext) -> None:
    security_codes = [tag.code for tag in resource.meta.security or []]
    for code in security_codes:
        allowed_roles = SENSITIVE_CATEGORY_ROLES.get(code)
        if allowed_roles and not allowed_roles.intersection(set(requester.roles)):
            raise SensitiveRecordAccessDeniedError(
                f"Record has sensitivity category '{code}'. Access requires role in {allowed_roles}"
            )
```

---

## 7. Data-Layer Row Security (FHIR Server Side)

The FHIR server is the innermost layer and handles tenant isolation only: every row has `user_id` and `org_id`, and every query filters by these. This is the row-level tenancy guarantee.

The FHIR server has **no JWT auth middleware by design** — it is a private data plane reachable only from Pulse. JWT validation, scope enforcement, RBAC, and ABAC all live in Pulse. The FHIR server reads `user_id` (from `sub`) and `org_id` (from `activeOrganizationId`) out of the already-validated token claims that Pulse forwards.

### Settings Additions Needed

```python
class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    FHIR_DATABASE_URL: str
    REDIS_URL: str
    # IAM endpoints — used for SMART discovery + CapabilityStatement only
    IAM_ISSUER: str
    IAM_JWKS_URL: str
    IAM_AUDIENCE: str = "fhir-server"
    IAM_AUTH_ENDPOINT: str
    IAM_TOKEN_ENDPOINT: str
    IAM_REVOKE_ENDPOINT: str
    IAM_INTROSPECT_ENDPOINT: str
    IAM_REGISTRATION_ENDPOINT: str
    # DB pool
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE: int = 1800
    DB_POOL_PRE_PING: bool = True
```

### Network Isolation Requirement

The FHIR server must only accept inbound connections from Pulse on an internal network. It must **not** be reachable from the public internet or from any service other than Pulse. Enforce this at the infrastructure level (firewall, security group, VPC routing).

---

## 8. Break-Glass Pattern

### Flow

```
1. Practitioner opens patient chart (denied — no care team membership)
2. UI prompts: "Access restricted. Provide emergency access reason."
3. Practitioner enters reason (≥ 20 chars)
4. POST /pulse/break-glass/request { patient_id, reason, duration_minutes: 60 }
5. Middle layer:
   a. Validates requester has emergency_access role
   b. Stores time-limited token in Redis: break_glass:{user}:{patient}
   c. Synchronously writes critical AuditEvent (never fire-and-forget)
   d. Sends immediate alert to supervisor / compliance officer
   e. Returns break-glass session token
6. Subsequent requests carry X-Break-Glass-Token header
7. Every PHI access during break-glass session is AuditEvent-logged with reason
8. After expiry, access reverts; compliance report generated automatically
```

### Compliance Report (generated on expiry):

```json
{
  "break_glass_session": "bg-uuid-here",
  "requester": "Practitioner/30001",
  "patient": "Patient/10001",
  "reason": "Patient presented unconscious in ER, no consent obtainable",
  "granted_at": "2026-06-08T14:30:00Z",
  "expired_at": "2026-06-08T15:30:00Z",
  "resources_accessed": [
    { "resource": "Patient/10001", "action": "read", "timestamp": "2026-06-08T14:30:15Z" },
    { "resource": "AllergyIntolerance?patient=10001", "action": "search", "timestamp": "2026-06-08T14:30:17Z" },
    { "resource": "MedicationRequest?patient=10001&status=active", "action": "search", "timestamp": "2026-06-08T14:30:20Z" }
  ],
  "supervisor_notified": "admin@hospital.com",
  "auto_reviewed": false,
  "compliance_review_due": "2026-06-15T15:30:00Z"
}
```

---

## 9. Authorization Decision Logging

Every authorization decision (permit or deny) must be logged. Not just the final decision — each layer:

```python
@dataclass
class AuthDecisionLog:
    request_id: str
    user_id: str
    resource_type: str
    resource_id: str | None
    action: str
    decisions: list[LayerDecision]  # one per auth layer
    final: Literal["permit", "deny"]
    duration_ms: float

@dataclass
class LayerDecision:
    layer: str   # "jwt", "scope", "rbac", "workflow", "abac", "consent"
    result: Literal["pass", "fail", "skip"]
    reason: str | None
```

These logs ship to the SIEM (not the FHIR AuditEvent table — they are security infrastructure, not clinical audit).

---

## 10. `.well-known/smart-configuration`

Add to the FHIR server (see `doc 08 §2` for the full implementation). All endpoint URLs come from `Settings` — no hardcoded IAM paths. The FHIR server serves this endpoint but points consumers at the IAM for actual auth:

```python
# app/routers/smart_config.py
@router.get("/.well-known/smart-configuration", include_in_schema=False)
async def smart_configuration():
    return JSONResponse(content={
        "issuer": settings.IAM_ISSUER,
        "jwks_uri": settings.IAM_JWKS_URL,
        "authorization_endpoint": settings.IAM_AUTH_ENDPOINT,
        "token_endpoint": settings.IAM_TOKEN_ENDPOINT,
        "token_endpoint_auth_methods_supported": ["private_key_jwt", "client_secret_basic"],
        "grant_types_supported": ["authorization_code", "client_credentials"],
        "registration_endpoint": settings.IAM_REGISTRATION_ENDPOINT,
        "scopes_supported": [
            "openid", "profile", "launch", "launch/patient",
            "patient/*.r", "patient/*.rs", "patient/*.cruds",
            "user/*.r", "user/*.rs", "user/*.cruds",
            "system/*.r", "system/*.rs", "system/*.cruds",
        ],
        "response_types_supported": ["code"],
        "code_challenge_methods_supported": ["S256"],
        "capabilities": [
            "launch-ehr", "launch-standalone", "client-public",
            "client-confidential-symmetric", "client-confidential-asymmetric",
            "context-ehr-patient", "context-ehr-encounter",
            "permission-patient", "permission-user", "permission-v2",
            "authorize-post",
        ],
    })
```
