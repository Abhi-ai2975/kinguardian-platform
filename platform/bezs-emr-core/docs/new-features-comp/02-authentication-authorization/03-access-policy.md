# AccessPolicy — Fine-Grained FHIR Authorization

**Medplum reference:** `packages/server/src/auth/accesspolicy.ts`

---

## Why We Need AccessPolicy

Our current authorization: a JWT says who you are. But we have no model for:
- "Nurses can read Patient but not create"
- "Dr. Smith can only see patients in Clinic A"
- "The billing team can access Claim and Invoice but not clinical notes"
- "Patient John can only see his own records"
- "This API key can only write Observation resources"

Without fine-grained access control, we must give all authenticated users access to  
everything — which is a HIPAA violation and a security nightmare in a multi-tenant system.

---

## AccessPolicy Resource

AccessPolicy is a Medplum-specific (non-standard) FHIR resource that defines what a  
user/role/client can do. We'll implement it as a stored resource in our system.

```json
{
  "resourceType": "AccessPolicy",
  "id": "policy-nurse",
  "name": "Nurse Role Policy",
  "resource": [
    {
      "resourceType": "Patient",
      "readonly": true
    },
    {
      "resourceType": "Observation",
      "readonly": false
    },
    {
      "resourceType": "Condition",
      "readonly": false
    },
    {
      "resourceType": "MedicationRequest",
      "readonly": true,
      "criteria": "MedicationRequest?status=active"
    }
  ]
}
```

### AccessPolicy Fields

| Field | Description |
|---|---|
| `resource[].resourceType` | The FHIR resource type this rule applies to |
| `resource[].readonly` | If true, user can only read (not write/delete) |
| `resource[].criteria` | FHIR search filter — limits which instances are visible |
| `resource[].writeConstraint` | FHIRPath expression that must be true to write |
| `resource[].hiddenFields` | Fields to strip from responses (e.g., SSN) |
| `resource[].readonlyFields` | Fields user can read but not update |

---

## Compartment-Based Policies

The most common pattern: patients can only see their own data.

```json
{
  "resourceType": "AccessPolicy",
  "name": "Patient Portal Policy",
  "compartment": {
    "reference": "%patient"
  },
  "resource": [
    { "resourceType": "Patient", "readonly": true },
    { "resourceType": "Encounter", "readonly": true },
    { "resourceType": "Condition", "readonly": true },
    { "resourceType": "MedicationRequest", "readonly": true },
    { "resourceType": "Observation", "readonly": true }
  ]
}
```

`%patient` is a template variable — replaced with the SMART `patient` context at runtime.  
Every query is automatically scoped: `WHERE patient_id = :patient_fhir_id`.

---

## Role Definitions

```json
/* Practitioner (full clinical access) */
{
  "resourceType": "AccessPolicy",
  "name": "Practitioner Full Access",
  "resource": [{ "resourceType": "*" }]   /* wildcard = all resources */
}

/* Billing Staff */
{
  "resourceType": "AccessPolicy",
  "name": "Billing Staff",
  "resource": [
    { "resourceType": "Patient", "readonly": true },
    { "resourceType": "Claim" },
    { "resourceType": "ClaimResponse" },
    { "resourceType": "Invoice" },
    { "resourceType": "Coverage" }
  ]
}

/* Lab Technician */
{
  "resourceType": "AccessPolicy",
  "name": "Lab Technician",
  "resource": [
    { "resourceType": "Patient", "readonly": true },
    { "resourceType": "Specimen" },
    { "resourceType": "Observation" },
    { "resourceType": "DiagnosticReport" }
  ]
}
```

---

## Database Schema

```sql
CREATE TABLE access_policies (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER NOT NULL,     -- sequence-based public ID
    name TEXT NOT NULL,
    policy JSONB NOT NULL,          -- full AccessPolicy resource
    org_id TEXT NOT NULL,
    is_system BOOLEAN DEFAULT FALSE, -- system-wide vs org-scoped
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: users have policies
CREATE TABLE user_access_policies (
    user_id TEXT NOT NULL,
    policy_id INTEGER NOT NULL REFERENCES access_policies(id),
    granted_by TEXT NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, policy_id)
);

-- Many-to-many: OAuth2 clients have policies
CREATE TABLE client_access_policies (
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id),
    policy_id INTEGER NOT NULL REFERENCES access_policies(id),
    PRIMARY KEY (client_id, policy_id)
);
```

---

## Implementation Plan

### Step 1 — Policy Loader

```python
# app/auth/access_policy.py

@dataclass
class ResourcePolicy:
    resource_type: str
    readonly: bool
    criteria: str | None
    hidden_fields: list[str]
    readonly_fields: list[str]

class AccessPolicyEngine:
    async def load_for_user(self, user_id: str, org_id: str) -> list[ResourcePolicy]:
        """Load all policies assigned to this user."""
        ...

    def can_read(self, policies: list[ResourcePolicy], resource_type: str) -> bool:
        return any(
            p.resource_type in (resource_type, "*")
            for p in policies
        )

    def can_write(self, policies: list[ResourcePolicy], resource_type: str) -> bool:
        return any(
            p.resource_type in (resource_type, "*") and not p.readonly
            for p in policies
        )

    def get_criteria_filter(self, policies: list[ResourcePolicy], resource_type: str) -> str | None:
        """Return a FHIR search criteria string that must be added to all queries."""
        for p in policies:
            if p.resource_type in (resource_type, "*") and p.criteria:
                return p.criteria
        return None

    def strip_hidden_fields(self, resource: dict, policies: list[ResourcePolicy]) -> dict:
        """Remove fields the user is not allowed to see."""
        resource_type = resource.get("resourceType", "")
        for p in policies:
            if p.resource_type in (resource_type, "*") and p.hidden_fields:
                for field in p.hidden_fields:
                    resource.pop(field, None)
        return resource
```

### Step 2 — Middleware Integration

```python
# app/auth/middleware.py

async def access_policy_middleware(request: Request, call_next):
    if not hasattr(request.state, "user"):
        return await call_next(request)
    user = request.state.user
    policies = await policy_engine.load_for_user(user["sub"], user["activeOrganizationId"])
    request.state.access_policies = policies
    return await call_next(request)
```

### Step 3 — Query Filter Injection

Inject access policy criteria into every list query:

```python
# In repository base class
def _apply_access_policy(self, stmt, policies: list[ResourcePolicy], resource_type: str):
    criteria = policy_engine.get_criteria_filter(policies, resource_type)
    if criteria:
        # Parse criteria string and apply as WHERE clause
        # e.g. "MedicationRequest?status=active" → .where(MedicationRequest.status == "active")
        stmt = apply_fhir_criteria(stmt, criteria)
    return stmt
```

### Step 4 — AccessPolicy CRUD Endpoints

```python
@router.post("/AccessPolicy", operation_id="create_access_policy")
async def create_policy(body: AccessPolicyCreate, request: Request, svc=Depends(get_policy_svc)):
    require_permission("AccessPolicy", "create")(request)
    policy = await svc.create(body, request.state.user)
    return format_response(request, policy, to_fhir_access_policy, to_plain_access_policy)
```

---

## Predefined System Policies

Seed these on startup:

| Policy | Description |
|---|---|
| `system-superadmin` | All resources, all operations, no restrictions |
| `system-practitioner` | All clinical resources, read/write |
| `system-nurse` | Clinical resources, limited write |
| `system-billing` | Claim, Invoice, Coverage, Patient (read-only) |
| `system-patient-portal` | Patient's own data only, read-only |
| `system-lab` | Specimen, Observation, DiagnosticReport |
| `system-readonly` | All resources, read-only |
