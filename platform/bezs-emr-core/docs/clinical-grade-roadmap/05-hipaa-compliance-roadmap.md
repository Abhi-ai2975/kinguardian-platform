# HIPAA Compliance Roadmap

> Implementation plan for HIPAA Security Rule technical safeguards, Privacy Rule controls, and the December 2024 NPRM changes that take effect in 2026.

---

## Regulatory Context

### Current Requirements (45 CFR Part 164)

| Rule | Requirement | Status |
|---|---|---|
| Security Rule §164.312(a)(1) | Access controls — unique user ID, emergency access, auto-logoff | ⚠️ Partial |
| Security Rule §164.312(a)(2)(iv) | Encryption/decryption (addressable → becoming required) | ❌ Missing |
| Security Rule §164.312(b) | Audit controls — record PHI activity | ❌ Missing (AuditEvent exists but not auto-emitted) |
| Security Rule §164.312(c) | Integrity controls — prevent improper alteration | ⚠️ Partial (no soft-delete, no versioning) |
| Security Rule §164.312(d) | Authentication | ⚠️ Partial (Keycloak wired, no JWT middleware) |
| Security Rule §164.312(e)(1) | Transmission security — TLS | ❌ Not configured |
| Privacy Rule §164.502 | Use and disclosure limits | ❌ No consent enforcement |
| Breach Notification Rule | 60-day notification if unsecured PHI breached | ❌ No breach detection |

### December 2024 NPRM (Final Rule ~May 2026)

The HHS OCR proposed rule would:
1. **Remove the "addressable" vs "required" distinction** — all implementation specifications become required
2. **Mandate encryption of ePHI at rest and in transit** (no exceptions)
3. **Require multi-factor authentication** for access to ePHI systems
4. **Mandate annual penetration testing**
5. **Require 72-hour breach notification** (down from 60 days)
6. **Require written security incident response plan** with annual testing

Design for all of these now — the 240-day compliance window after final rule publication will be short.

---

## Implementation Plan

### Phase 1 — Legal Floor (Must complete before storing any PHI)

#### 1.1 TLS Enforcement

**What to do:**
- Configure nginx/Caddy as reverse proxy with TLS 1.3 (TLS 1.2 minimum)
- Add `Strict-Transport-Security` header: `max-age=31536000; includeSubDomains; preload`
- Redirect all HTTP → HTTPS (301)
- Disable weak cipher suites

**nginx snippet:**
```nginx
server {
    listen 443 ssl http2;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

**FastAPI side:** Add `SecurityHeadersMiddleware`:
```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        return response
```

#### 1.2 Encryption at Rest

| Component | Mechanism |
|---|---|
| PostgreSQL | AWS RDS with `storage_encrypted = true` (AES-256 via AWS KMS), or pg_crypto for column-level for extra-sensitive fields |
| Redis | AWS ElastiCache with in-transit and at-rest encryption enabled |
| Application logs | CloudWatch Logs with KMS encryption |
| Backups | S3 server-side encryption (SSE-KMS) |
| Secrets | AWS Secrets Manager with KMS |

**Column-level encryption for ultra-sensitive fields** (SSN, government ID, mental health notes):
```python
from cryptography.fernet import Fernet

class EncryptedString(TypeDecorator):
    """SQLAlchemy type that encrypts/decrypts strings using Fernet."""
    impl = String
    cache_ok = True

    def __init__(self, key: bytes):
        self.fernet = Fernet(key)
        super().__init__()

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return self.fernet.encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return self.fernet.decrypt(value.encode()).decode()
```

#### 1.3 JWT Validation Middleware

See `04-authorization-workflow-design.md` section 7 for the full implementation. This is the most urgent P0 gap — currently any request passes auth.

Add to `main.py`:
```python
app.add_middleware(
    JWTAuthMiddleware,
    jwks_url=settings.IAM_JWKS_URL,
    issuer=settings.IAM_ISSUER,
    audience=settings.IAM_AUDIENCE,
)
```

#### 1.4 Secrets Management

Replace `.env` file with AWS Secrets Manager (or HashiCorp Vault):

```python
import boto3
import json

def load_secrets_from_aws(secret_name: str, region: str = "us-east-1") -> dict:
    client = boto3.client("secretsmanager", region_name=region)
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response["SecretString"])

class Settings(BaseSettings):
    @classmethod
    def from_aws_secrets(cls, secret_name: str) -> "Settings":
        secrets = load_secrets_from_aws(secret_name)
        return cls(**secrets)
```

Alternatively, use Vault agent sidecar injection to write secrets to a tmpfs mount that pydantic-settings reads.

#### 1.5 BAA Inventory

Create and maintain a BAA registry. Every PHI-touching vendor needs a signed BAA:

| Vendor | Service | BAA Status | PHI Exposure | Review Date |
|---|---|---|---|---|
| AWS | RDS PostgreSQL | ⬜ Pending | Database (all PHI) | - |
| AWS | ElastiCache Redis | ⬜ Pending | Session tokens, rate limit keys | - |
| AWS | CloudWatch Logs | ⬜ Pending | Application logs may contain PHI | - |
| AWS | S3 | ⬜ Pending | Backups, bulk exports | - |
| AWS | SES | ⬜ Pending | Patient notification emails | - |
| Keycloak (self-hosted) | Identity | N/A | User credentials only | - |
| Datadog / Grafana Cloud | Monitoring | ⬜ Pending | Metrics may contain PHI if not filtered | - |

**Note:** AWS HIPAA-eligible services are listed at aws.amazon.com/compliance/hipaa-eligible-services-reference/. The BAA covers only listed services. Verify every service before use.

---

### Phase 2 — Audit Controls (HIPAA §164.312(b))

#### 2.1 FHIR AuditEvent Auto-Emission

**Goal:** Every read/write/search/delete of any PHI resource produces a FHIR AuditEvent record.

**Implementation — AuditEvent Middleware in the FHIR Server:**

```python
AUDITED_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}
AUDIT_EXCLUDED = {"/health", "/health/ready", "/favicon.ico", "/openapi.json", "/docs"}

class PHIAuditMiddleware(BaseHTTPMiddleware):
    """
    Writes FHIR AuditEvent for every PHI-touching request.
    Runs after the JWT middleware so request.state.user is populated.
    """
    async def dispatch(self, request: Request, call_next):
        if request.url.path in AUDIT_EXCLUDED:
            return await call_next(request)
        if not request.url.path.startswith("/api/fhir/v1"):
            return await call_next(request)

        start = time.monotonic()
        response = await call_next(request)
        duration_ms = (time.monotonic() - start) * 1000

        # Fire-and-forget audit — must not block the response
        asyncio.create_task(
            self._emit_audit(request, response.status_code, duration_ms)
        )
        return response

    async def _emit_audit(self, request: Request, status_code: int, duration_ms: float):
        user = getattr(request.state, "user", {})
        outcome = "0" if status_code < 400 else ("4" if status_code < 500 else "8")
        
        action_map = {"GET": "R", "POST": "C", "PUT": "U", "PATCH": "U", "DELETE": "D"}
        action = action_map.get(request.method, "E")
        
        event = {
            "user_id": user.get("sub", "anonymous"),
            "org_id": user.get("activeOrganizationId"),
            "created_by": user.get("sub", "system"),
            "type_system": "http://terminology.hl7.org/CodeSystem/audit-event-type",
            "type_code": "rest",
            "type_display": "RESTful Operation",
            "action": action,
            "recorded": datetime.utcnow().isoformat() + "Z",
            "outcome": outcome,
            "outcome_desc": f"HTTP {status_code}",
            "agent_type": "user" if user else "system",
            "agent_who_reference": f"Practitioner/{user.get('sub', 'unknown')}",
            "agent_requestor": True,
            "agent_network_address": (
                request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                or (request.client.host if request.client else "unknown")
            ),
            "source_observer_reference": "Device/fhir-server",
            "entity_what_reference": request.url.path,
        }
        
        try:
            async with self.db.session() as session:
                # Direct DB insert to avoid circular dependency through service layer
                stmt = insert(AuditEventModel).values(**event)
                await session.execute(stmt)
                await session.commit()
        except Exception as e:
            logger.error("Failed to write AuditEvent", exc_info=e)
            # Log failure to SIEM separately — never swallow audit failures silently
```

#### 2.2 Audit Log Integrity

Audit records must not be modifiable after creation:
1. No `PATCH /audit-events/{id}` endpoint (already present as CRUD — **remove the PUT/PATCH/DELETE routes**)
2. PostgreSQL row-level security: `GRANT SELECT, INSERT ON audit_events TO app_user;` (no UPDATE/DELETE)
3. Consider writing audit events to an **append-only S3 bucket** in addition to the database — immutable object storage

#### 2.3 Audit Retention

HIPAA requires 6-year retention of security documentation. For audit logs:
- Keep in PostgreSQL for 90 days (hot, queryable)
- Archive to S3 Glacier after 90 days (cold, encrypted, append-only)
- Retain for 7 years minimum (exceeds HIPAA 6-year requirement)

---

### Phase 3 — Access Controls (HIPAA §164.312(a))

#### 3.1 Multi-Factor Authentication

Keycloak supports TOTP and WebAuthn out of the box:
```
Keycloak Admin Console → Authentication → Flows
→ Duplicate "Browser" flow
→ Add "OTP Form" as Required after "Username Password Form"
→ Assign new flow to healthcare-platform realm
```

For patient-facing access, consider SMS OTP via Twilio (BAA required).

#### 3.2 Automatic Session Timeout

Configure in Keycloak:
- SSO Session Idle: 15 minutes (clinical workstations)
- SSO Session Max: 8 hours
- Access Token Lifespan: 5 minutes (short — refresh tokens handle continuity)

Configure Redis session TTL in `SessionManager`:
```python
self.ttl = settings.SESSION_TTL_SECONDS  # 900 (15 min), reset on activity
```

#### 3.3 Emergency Access Procedure

See `04-authorization-workflow-design.md` section 8 for break-glass implementation.

HIPAA §164.312(a)(2)(ii) requires "establishing and implementing as needed procedures for obtaining necessary electronic protected health information during an emergency." Break-glass is the technical implementation of this.

---

### Phase 4 — Integrity Controls (HIPAA §164.312(c))

#### 4.1 Resource Versioning

Every mutating operation must maintain a version history:

```python
class PatientVersionModel(FHIRBase):
    __tablename__ = "patient_versions"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), index=True)
    version_id = Column(Integer, nullable=False)
    data = Column(JSONB, nullable=False)        # full snapshot at this version
    changed_by = Column(String, nullable=False)
    changed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    change_type = Column(String, nullable=False)  # "create", "update", "delete"
    change_reason = Column(String)               # optional reason for change
```

FHIR `_history` endpoint:
```
GET /api/fhir/v1/patients/{id}/_history          list all versions
GET /api/fhir/v1/patients/{id}/_history/{vid}    get specific version
```

#### 4.2 Soft Delete

Replace hard delete with logical deletion:

```python
# PatientModel gains:
is_deleted = Column(Boolean, default=False, index=True)
deleted_at = Column(DateTime)
deleted_by = Column(String)
deletion_reason = Column(String)

# Repository.delete() becomes:
async def delete(self, patient_id: int, deleted_by: str, reason: str) -> bool:
    async with self.session_factory() as session:
        patient = await session.get(PatientModel, patient_id)
        if not patient:
            return False
        patient.is_deleted = True
        patient.deleted_at = datetime.utcnow()
        patient.deleted_by = deleted_by
        patient.deletion_reason = reason
        await session.commit()
        return True

# All queries gain: WHERE is_deleted = FALSE
```

---

### Phase 5 — Breach Response Plan

#### 5.1 Breach Detection

Set up automated detection rules in your SIEM:
1. **Mass export alert:** Any user downloading >50 records in 10 minutes
2. **Off-hours access alert:** Any PHI access between 11pm–5am
3. **Cross-org access attempt:** `user.org_id != resource.org_id` in access log
4. **Failed auth spike:** >10 failed JWT validations from same IP in 1 minute
5. **Break-glass frequency:** >3 break-glass activations per user per month
6. **Unusual query patterns:** Queries accessing patients not in care team

#### 5.2 Incident Response Runbook

```
BREACH SUSPECTED
     │
     ▼
1. Contain: Revoke all active sessions for affected users (Redis flush by pattern)
            Rotate secrets if credentials compromised
     │
     ▼
2. Investigate: Pull AuditEvent records for affected patients/timeframe
                Determine PHI exposure scope
                Preserve logs (immutable S3 copy)
     │
     ▼
3. Assess: Was PHI actually accessed? By whom? How many patients?
           Was data encrypted? (If yes → safe harbor under HITECH)
     │
     ▼
4. Notify (if confirmed breach):
   - Internal security officer: immediate
   - Affected individuals: within 72 hours (per 2026 NPRM) / 60 days (current)
   - HHS OCR: within 60 days (>500 individuals: same day via HHS website)
   - Media (if state breach >500): simultaneous with HHS if required by state law
     │
     ▼
5. Remediate: Patch vulnerability, update policies, retrain staff
6. Document: Incident report, decisions made, timeline
```

---

### Phase 6 — HIPAA Privacy Rule

#### 6.1 Minimum Necessary

FHIR `_elements` parameter allows returning only needed fields:
```
GET /patients/{id}?_elements=name,birthDate,gender
```

Implement `_elements` projection in the repository layer (PostgreSQL JSON filtering).

#### 6.2 Patient Rights

| Right | Implementation |
|---|---|
| Access (§164.524) | `GET /api/fhir/v1/patients/{id}/$everything` — patient portal |
| Amendment (§164.526) | `PATCH /patients/{id}` + `POST /provenance` documenting amendment |
| Accounting of Disclosures (§164.528) | AuditEvent report filtered by patient and date range |
| Restriction Request (§164.522) | FHIR `Consent` resource with restriction provision |

---

### HIPAA Compliance Checklist

**Before first PHI write:**
- [ ] TLS 1.2+ enforced at reverse proxy
- [ ] AES-256 at rest for PostgreSQL, Redis, S3 backups
- [ ] JWT validation middleware active
- [ ] Secrets in Secrets Manager (not `.env`)
- [ ] BAAs signed with all PHI-touching vendors
- [ ] PHIAuditMiddleware emitting AuditEvents
- [ ] Audit log is append-only (no UPDATE/DELETE permissions)
- [ ] MFA enabled for all practitioner/admin accounts
- [ ] Session timeout configured (15 min idle)
- [ ] Encrypted, tested backup plan operational

**Before go-live:**
- [ ] RBAC implemented and tested
- [ ] Break-glass access pattern live
- [ ] Resource versioning / soft delete
- [ ] Breach detection rules in SIEM
- [ ] Written incident response plan
- [ ] Annual penetration test scheduled
- [ ] HIPAA Security Rule risk analysis documented
- [ ] Staff HIPAA training completed and documented
- [ ] Privacy Notice (NPP) updated for EHR access
- [ ] Workforce policies (access request, termination, sanction) documented

**Post-launch (ongoing):**
- [ ] Annual risk assessment
- [ ] Annual penetration test (required under 2026 NPRM)
- [ ] Annual workforce training
- [ ] Quarterly review of user access list
- [ ] Monthly review of PHI-access anomaly alerts
- [ ] Verify backup restores quarterly
