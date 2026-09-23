# HIPAA Technical Safeguards Implementation

**Regulation:** 45 CFR § 164.312 — Technical Safeguards  
**Guidance:** https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html

---

## HIPAA Technical Safeguards Checklist

### § 164.312(a)(1) — Access Control

| Requirement | Status | Implementation |
|---|---|---|
| Unique user identification | Required | JWT `sub` claim = unique user ID |
| Emergency access procedure | Required | Break-glass override with mandatory audit |
| Automatic logoff | Required | Session expiry (Redis-backed) |
| Encryption and decryption | Addressable | Database encryption + TLS |

#### Unique User Identification — Implementation

Every request is authenticated with a unique user identifier from the JWT.  
Service accounts must also use unique client IDs (not shared secrets).

```python
# Enforce: no shared credentials
# Each API client must have its own client_id in oauth_clients table
# Service accounts: client_credentials grant with unique client_id
```

#### Automatic Session Logoff

```python
# app/core/session.py

SESSION_TIMEOUT_MINUTES = 30  # configurable per org

async def extend_session(session_id: str, user_id: str) -> None:
    """Called on every authenticated request."""
    await redis.setex(f"session:{session_id}", SESSION_TIMEOUT_MINUTES * 60, user_id)

async def check_session(session_id: str) -> str | None:
    """Returns user_id if session is valid, None if expired."""
    return await redis.get(f"session:{session_id}")
```

#### Emergency Access (Break-Glass)

```python
# app/auth/break_glass.py

class BreakGlassService:
    async def request_break_glass(self, user_id: str, patient_id: int, reason: str) -> str:
        """Grant temporary emergency access with mandatory audit."""
        token = secrets.token_urlsafe(32)
        await redis.setex(f"break-glass:{token}", 3600, json.dumps({
            "user_id": user_id, "patient_id": patient_id, "reason": reason
        }))
        # Write CRITICAL audit event
        await audit_svc.log_break_glass(user_id, patient_id, reason)
        # Notify security team
        await notify_security(user_id, patient_id, reason)
        return token
```

---

### § 164.312(b) — Audit Controls

Covered in detail in [01-audit-logging.md](./01-audit-logging.md).

| Requirement | Status | Implementation |
|---|---|---|
| Audit all PHI access | Required | AuditMiddleware on all PHI endpoints |
| Tamper-evident logs | Required | Append-only table + checksum |
| 6-year retention | Required | Archive to cold storage |
| Breach detection | Addressable | Automated pattern scanning |

---

### § 164.312(c)(1) — Integrity

| Requirement | Status | Implementation |
|---|---|---|
| Protect ePHI from improper alteration | Required | Resource versioning + ETag |
| Transmission integrity | Addressable | TLS + checksum |

```python
# Resource integrity via version_id + checksum on sensitive fields
# On every PATCH, compare submitted payload against stored
# Flag if version_id mismatch → optimistic concurrency control
```

---

### § 164.312(d) — Person or Entity Authentication

| Requirement | Status | Implementation |
|---|---|---|
| Verify user identity | Required | JWT with JWKS validation |
| Multi-factor authentication | Addressable | MFA via IAM provider |
| Session token security | Required | Short-lived JWTs + refresh tokens |

```python
# JWT validation on every request:
# 1. Verify signature (JWKS)
# 2. Verify expiry (exp claim)
# 3. Verify audience (aud claim)
# 4. Verify issuer (iss claim)
# 5. Check token not revoked (Redis blacklist on logout)

BLACKLISTED_TOKENS = "jwt:blacklist:{jti}"

async def is_token_revoked(jti: str) -> bool:
    return await redis.exists(f"jwt:blacklist:{jti}")

async def revoke_token(jti: str, exp: int) -> None:
    ttl = exp - int(time.time())
    if ttl > 0:
        await redis.setex(f"jwt:blacklist:{jti}", ttl, "1")
```

---

### § 164.312(e)(1) — Transmission Security

| Requirement | Status | Implementation |
|---|---|---|
| Encrypt data in transit | Required | TLS 1.2+ (enforced by reverse proxy) |
| Protect against eavesdropping | Required | TLS |
| No unencrypted PHI in query strings | Required | PHI only in request body, not URL |

```python
# Enforce HTTPS-only in production
@app.middleware("http")
async def enforce_https(request: Request, call_next):
    if settings.ENVIRONMENT == "production":
        if request.url.scheme != "https":
            return Response("HTTPS required", status_code=301, headers={
                "Location": str(request.url.replace(scheme="https")),
                "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            })
    return await call_next(request)
```

---

## Security Headers

```python
# app/core/security_headers.py

SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
    "Cache-Control": "no-store",  # Don't cache PHI responses
}

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response
```

---

## Rate Limiting

```python
# app/core/rate_limiting.py

from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# Per-user rate limits
@router.post("/Patient", dependencies=[Depends(RateLimiter(times=60, seconds=60))])
async def create_patient(...):
    ...

# Stricter limits for AI operations (expensive)
@router.post("/Patient/{id}/$ai", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def patient_ai(...):
    ...

# Auth endpoints: prevent brute force
@router.post("/oauth2/token", dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def token(...):
    ...
```

---

## Business Associate Agreement (BAA) Tracking

Track which third-party service providers have signed BAAs:

```sql
CREATE TABLE baa_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    provider_type TEXT NOT NULL,    -- 'cloud', 'ai', 'payment', 'communication'
    agreement_date DATE NOT NULL,
    expiry_date DATE,
    agreement_url TEXT,
    contact_email TEXT,
    org_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Required BAAs for our stack:
- AWS (Compute, S3, RDS) ✓ (available in AWS console)
- Anthropic (AI processing) ✓ (available if enterprise)
- OpenAI (AI processing) ✓ (available if enterprise)
- SendGrid / Twilio (notifications) — requires request
- Sentry (error monitoring) — requires request

---

## Incident Response Plan

```
1. Detection: Breach detected (automated alert or reported)
         ↓
2. Containment: Revoke tokens, disable compromised account
         ↓
3. Assessment: What PHI was exposed? Whose? For how long?
         ↓
4. Notification: 
   - Internal: Security team, leadership within 1 hour
   - Patients: Within 60 days of discovery (HIPAA Breach Notification Rule)
   - HHS: Within 60 days (or annually if <500 individuals)
   - Media: Within 60 days if >500 individuals in a state
         ↓
5. Remediation: Fix vulnerability, add safeguards
         ↓
6. Documentation: Full incident report retained 6 years
```
