# FileNest v1.0 — Security Architecture

**Version:** 1.0.0
**Status:** Approved for Engineering
**Classification:** Internal — Engineering Confidential
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Security Model Overview](#1-security-model-overview)
2. [Authentication Architecture](#2-authentication-architecture)
3. [Authorization Architecture](#3-authorization-architecture)
4. [API Key Security](#4-api-key-security)
5. [Service Account Security](#5-service-account-security)
6. [Signed URL Security](#6-signed-url-security)
7. [Encryption Architecture](#7-encryption-architecture)
8. [Network Security](#8-network-security)
9. [Domain Verification](#9-domain-verification)
10. [Threat Model](#10-threat-model)
11. [Audit and Detection](#11-audit-and-detection)
12. [Secure Development Practices](#12-secure-development-practices)

---

## 1. Security Model Overview

### 1.1 Defense-in-Depth Layers

```
Layer 1: Network
  WAF → DDoS Protection → Firewall → Network Policies

Layer 2: Transport
  TLS 1.3 on all connections
  Certificate pinning in SDKs

Layer 3: Authentication
  API Keys (bcrypt hashed) → Bearer token validation
  Service Accounts (client credentials flow)
  Future: OAuth 2.0

Layer 4: Authorization
  RBAC per project
  Scope validation per operation
  IP allowlist enforcement
  Origin validation

Layer 5: Data
  Encryption at rest (AES-256, customer-managed KMS)
  Encryption in transit (TLS 1.3)
  Field-level encryption for PII/PHI (v2)
  Storage isolation per organization

Layer 6: Application
  Metadata validation
  Virus scanning
  PHI/PII detection
  Checksum verification

Layer 7: Audit
  Immutable audit logs
  Anomaly detection
  Security event alerting
```

### 1.2 Threat Surface Analysis

| Surface | Threat | Mitigation |
|---------|--------|-----------|
| API endpoints | Unauthorized access | Auth middleware, RBAC |
| File uploads | Malware, polyglot files | ClamAV scan, MIME verification |
| File downloads | Unauthorized access | Signed URLs, permission check |
| API keys | Key theft, brute force | bcrypt hash, rate limiting, audit |
| Webhooks | SSRF, replay attacks | URL validation, HMAC signature, timestamp |
| Storage | Direct bucket access | IAM policies, no public buckets |
| Database | SQL injection | SQLAlchemy ORM, parameterized queries |
| Secrets | Credential leak | Vault/KMS, no env vars in logs |

---

## 2. Authentication Architecture

### 2.1 Authentication Methods

| Method | Use Case | Token Format |
|--------|----------|-------------|
| API Key | Server-to-server, backend | `fn_live_...` / `fn_test_...` |
| Service Account | Worker processes, CI/CD | `fn_sa_...` (client credentials) |
| Upload Token | Frontend file uploads | `fn_upload_token_...` (short-lived) |
| OAuth 2.0 (v2) | User-delegated access | JWT Bearer |

### 2.2 API Key Validation Flow

API keys are **stored and managed entirely in the IAM** (BetterAuth `apiKey` plugin).
The FileNest FastAPI backend does not maintain an `api_keys` table.

```
1. Client sends: Authorization: Bearer fn_live_abc123...xyz
2. Extract token; detect fn_live_ / fn_test_ prefix
3. POST {IAM_URL}/api/internal/verify-api-key { key: "fn_live_abc123...xyz" }
4. IAM calls auth.api.verifyApiKey, checks its api_keys table
5. IAM returns { userId, organizationId, projectId, scopes, isTestMode }
6. Build TenantContext { organization_id, project_id, scopes, actor_id }
```

**Performance note:** In Phase 6+, add a Redis cache keyed on SHA-256(raw_key) → TenantContext
with a 2-minute TTL to avoid an IAM round-trip on every request. For Phase 1, the direct call is acceptable.

```python
# backend/app/auth/dependencies.py
async def verify_api_key(raw_key: str) -> TenantContext:
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{settings.iam_url}/api/internal/verify-api-key",
            json={"key": raw_key},
        )
    if resp.status_code != 200:
        raise HTTPException(401, {"code": "INVALID_API_KEY"})
    data = resp.json()
    return TenantContext(
        organization_id=data["organizationId"],
        project_id=data.get("projectId"),
        actor_id=data["userId"],
        scopes=frozenset(data.get("scopes", [])),
        is_test_mode=raw_key.startswith("fn_test_"),
    )
```

**Key creation** — done by the console app (Phase 4) or directly via the IAM API:

```bash
POST {IAM_URL}/api/auth/api-key/create
Authorization: Bearer <iam-session-token>

{
  "name": "My Key",
  "metadata": {
    "organizationId": "<org_id>",
    "projectId": "<project_id>",
    "scopes": ["files:upload", "files:read", ...]
  }
}
```

### 2.3 Service Account Flow (Client Credentials)

```
POST /v1/auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=fn_sa_clientid...
&client_secret=fn_sa_secret...

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "upload download search"
}
```

Access tokens are short-lived JWTs (1 hour). Service accounts exchange credentials for tokens, then use tokens for API calls.

```python
def create_service_account_token(sa: ServiceAccount) -> str:
    payload = {
        "iss": "filenest",
        "sub": str(sa.id),
        "aud": "filenest-api",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "org": str(sa.organization_id),
        "proj": str(sa.project_id),
        "scopes": sa.scopes,
        "type": "service_account",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
```

### 2.4 Upload Token Flow

Upload tokens allow the frontend to upload directly without exposing the main API key:

```
Backend → POST /v1/upload-tokens (using API key) → upload_token
Browser → Receives upload_token from backend
Browser → FileNest SDK uses upload_token to call upload APIs
```

Upload token constraints are embedded in the token and cryptographically verified:

```python
def create_upload_token(constraints: UploadConstraints, ttl: int) -> str:
    payload = {
        "iss": "filenest",
        "aud": "filenest-upload",
        "iat": int(time.time()),
        "exp": int(time.time()) + ttl,
        "proj": constraints.project_id,
        "org": constraints.organization_id,
        "max_size": constraints.max_size,
        "allowed_mime_types": constraints.allowed_mime_types,
        "max_files": constraints.max_files,
        "folder_id": constraints.folder_id,
        "metadata_lock": constraints.metadata,  # Metadata set by backend, not overridable
    }
    return jwt.encode(payload, settings.upload_token_secret, algorithm="HS256")
```

---

## 3. Authorization Architecture

### 3.1 RBAC Model

```
Organization
  └── Users (have roles at org or project level)

Roles (system-defined):
  admin     → full control over org
  manager   → project management, no delete API keys
  editor    → file CRUD, metadata updates
  viewer    → read-only file access
  auditor   → read audit logs, no file modification

Role assignment:
  Org-level role → applies to all projects
  Project-level role → applies to specific project only
  Project-level overrides org-level (more specific wins)
```

### 3.2 Permission Matrix

| Permission | admin | manager | editor | viewer | auditor |
|-----------|-------|---------|--------|--------|---------|
| files:upload | ✓ | ✓ | ✓ | — | — |
| files:download | ✓ | ✓ | ✓ | ✓ | — |
| files:delete | ✓ | ✓ | ✓ | — | — |
| files:read | ✓ | ✓ | ✓ | ✓ | ✓ |
| files:update_metadata | ✓ | ✓ | ✓ | — | — |
| projects:read | ✓ | ✓ | ✓ | ✓ | ✓ |
| projects:update | ✓ | ✓ | — | — | — |
| projects:delete | ✓ | — | — | — | — |
| api_keys:create | ✓ | ✓ | — | — | — |
| api_keys:revoke | ✓ | — | — | — | — |
| users:invite | ✓ | ✓ | — | — | — |
| users:roles | ✓ | — | — | — | — |
| audit:read | ✓ | — | — | — | ✓ |
| compliance:manage | ✓ | — | — | — | — |
| webhooks:manage | ✓ | ✓ | — | — | — |

### 3.3 Scope-Based API Key Authorization

API keys declare their scopes at creation:

```python
VALID_SCOPES = {
    "upload",
    "download",
    "delete",
    "search",
    "files:read",
    "files:update_metadata",
    "webhook:manage",
    "audit:read",
    "compliance:manage",
    "admin",         # Includes all of the above
}

def check_scope(required_scope: str, auth: AuthContext) -> None:
    if "admin" in auth.scopes:
        return  # Admin scope bypasses all checks

    if required_scope not in auth.scopes:
        raise AuthorizationError(
            f"API key missing required scope: {required_scope}"
        )
```

### 3.4 Future ABAC (v2)

Attribute-Based Access Control will enable rules like:

```
ALLOW download IF file.metadata.patientId = request.user.patientId
ALLOW download IF file.folderId IN user.allowedFolders
DENY download IF file.phiDetected = true AND user.hipaaTrainingComplete = false
```

ABAC policies will be stored as JSON rules evaluated at request time. The RBAC layer remains as the floor; ABAC adds fine-grained constraints on top.

---

## 4. API Key Security

### 4.1 Key Generation

```python
def generate_api_key(environment: str) -> tuple[str, str, str]:
    """Returns (full_key, key_hash, display_prefix)"""
    prefix = "fn_live_" if environment == "production" else "fn_test_"
    random_part = secrets.token_urlsafe(48)  # 64 chars of URL-safe base64
    full_key = f"{prefix}{random_part}"

    # bcrypt with work factor 12 (slow enough to resist brute force, fast enough for cache miss)
    key_hash = bcrypt.hashpw(full_key.encode(), bcrypt.gensalt(rounds=12)).decode()

    # Display prefix shows enough to identify key without revealing it
    display_prefix = full_key[:16] + "..."

    return full_key, key_hash, display_prefix
```

### 4.2 Key Storage Security

- **Never stored in plaintext** — only bcrypt hash stored in DB
- **Never logged** — middleware strips Authorization header before logging
- **Never in stack traces** — exception handlers sanitize auth tokens
- **Returned once** — full key only returned at creation, never again
- **Prefix for identification** — first 16 chars shown for display purposes only

### 4.3 Key Rotation

```python
async def rotate_api_key(key_id: str, auth: AuthContext) -> RotationResult:
    old_key = await db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.organization_id == auth.organization_id,
    ).first()

    # Generate new key
    new_key_value, new_key_hash, new_prefix = generate_api_key(old_key.environment)

    # Create new key record pointing back to the old one
    new_key = APIKey(
        organization_id=old_key.organization_id,
        project_id=old_key.project_id,
        key_id=f"fn_key_{secrets.token_hex(8)}",
        key_hash=new_key_hash,
        key_prefix=new_prefix,
        name=old_key.name,
        scopes=old_key.scopes,
        rotated_from=old_key.id,
        rotated_at=datetime.utcnow(),
    )
    db.add(new_key)

    # Old key expires in 1 hour (grace period for in-flight requests)
    old_key.expires_at = datetime.utcnow() + timedelta(hours=1)
    old_key.status = "rotated"

    # Invalidate cache
    await redis.delete(f"apikey_cache:{sha256(old_key_value)}")

    await audit.log(event_type="api_key.rotated", subject_id=key_id, ...)

    return RotationResult(
        new_key=new_key_value,  # Only time the value is returned
        old_key_expires_at=old_key.expires_at,
    )
```

### 4.4 Key Brute Force Protection

```python
# Rate limit on auth failures per IP
async def check_auth_rate_limit(ip: str) -> None:
    key = f"auth_fail:{ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 300)  # 5 minute window

    if count > 10:  # More than 10 failures in 5 minutes
        raise RateLimitError(
            "Too many authentication failures",
            retry_after=await redis.ttl(key),
        )
```

---

## 5. Service Account Security

### 5.1 Client Secret Management

```python
def generate_client_secret() -> tuple[str, str]:
    """Returns (secret, hashed_secret)"""
    secret = f"fn_sa_{secrets.token_urlsafe(48)}"
    hashed = hashlib.sha256(secret.encode()).hexdigest()
    # Note: SHA-256 is acceptable here because:
    # - Service account secrets are 64 chars (high entropy)
    # - We rate-limit auth attempts
    # - bcrypt would be too slow for frequent service-to-service calls
    return secret, hashed
```

### 5.2 Token Scoping

Service account tokens embed scopes and cannot be escalated:

```python
# Service account with scope ['upload', 'download']
# Cannot call /v1/api-keys (requires 'admin' scope)
# Cannot call /v1/audit (requires 'audit:read' scope)
# Can call /v1/files/upload ✓
# Can call /v1/files/{id}/download ✓
```

---

## 6. Signed URL Security

### 6.1 Signed URL Architecture

```
Client Request:
GET /v1/files/{fileId}/download?ttl=3600

FileNest Flow:
1. Authenticate (API key)
2. Authorize (files:download scope)
3. Load file record (organization/project scoped)
4. Check file status (ready, not quarantined)
5. Check legal hold (download allowed, but logged)
6. Generate storage-provider signed URL
7. Log audit event: file.downloaded
8. Return { url, expiresAt }

Signed URL:
https://s3.amazonaws.com/bucket/key?
  X-Amz-Algorithm=AWS4-HMAC-SHA256&
  X-Amz-Credential=...&
  X-Amz-Date=...&
  X-Amz-Expires=3600&
  X-Amz-SignedHeaders=host&
  X-Amz-Signature=...
```

### 6.2 Signed URL Security Properties

| Property | Value |
|----------|-------|
| Minimum TTL | 60 seconds |
| Maximum TTL | 86400 seconds (24 hours) |
| Default TTL | 3600 seconds (1 hour) |
| Single-use option | Available (uses Redis counter) |
| IP-pinned option | Available |
| Content-Type lock | Always (prevents content sniffing) |
| Content-Disposition | Always set (prevents inline execution) |
| Download count limit | Configurable per request |

### 6.3 Single-Use URL Implementation

```python
async def generate_single_use_signed_url(
    file_id: str, storage_key: str, ttl: int
) -> str:
    # Generate the signed URL
    signed_url = await storage_provider.generate_signed_url(
        key=storage_key,
        ttl_seconds=ttl,
    )

    # Register in Redis with usage counter
    url_id = secrets.token_urlsafe(16)
    redis_key = f"single_use_url:{url_id}"
    await redis.setex(redis_key, ttl, json.dumps({
        "file_id": file_id,
        "storage_url": signed_url,
        "used": False,
    }))

    # Return FileNest proxy URL (not direct storage URL)
    return f"https://api.filenest.io/v1/files/{file_id}/proxy?token={url_id}"

async def proxy_single_use_download(url_id: str) -> RedirectResponse:
    redis_key = f"single_use_url:{url_id}"
    entry = await redis.get(redis_key)

    if not entry:
        raise NotFoundError("Download URL not found or expired")

    data = json.loads(entry)
    if data["used"]:
        raise ConflictError("This download URL has already been used")

    # Mark as used atomically
    data["used"] = True
    await redis.set(redis_key, json.dumps(data))

    return RedirectResponse(url=data["storage_url"])
```

---

## 7. Encryption Architecture

### 7.1 At Rest Encryption

**Layer 1: Storage Provider Encryption**

All object storage uses server-side encryption. FileNest controls this via the `sse_enabled`
flag on each `storage_configs` row and the `ServerSideEncryption: AES256` S3 API header.

| Provider | Phase 1 behaviour | `sse_enabled` default |
|----------|-------------------|-----------------------|
| AWS S3 | SSE-S3 (`AES256`) or SSE-KMS if `server_side_encryption = 'aws:kms'` | `true` (always on) |
| Cloudflare R2 | Default encryption (R2 encrypts all objects automatically) | `true` (always on) |
| Azure Blob | Azure-managed keys — always on, not configurable via FileNest | `true` (always on) |
| GCS | Google-managed keys — always on, not configurable via FileNest | `true` (always on) |
| MinIO | SSE-S3 (`ServerSideEncryption: AES256`) when enabled — requires `MINIO_KMS_SECRET_KEY` on the server | `false` (user-togglable) |
| RustFS | Same as MinIO — requires `RUSTFS_KMS_SECRET_KEY` on the server | `false` (user-togglable) |

MinIO and RustFS `sse_enabled` can be toggled per project via `PATCH /v1/projects/{id}/storage/sse`.
The platform env vars `MINIO_KMS_SECRET_KEY` and `RUSTFS_KMS_SECRET_KEY` must be set on the
respective server processes for the encryption header to have any effect.

**Phase 6+:** Customer-managed KMS keys for S3 (CMK), Azure Key Vault, and Cloud KMS.

**Layer 2: Database Encryption — Application-Level (AES-256-GCM)**

- PostgreSQL storage volume encrypted at OS level (EBS encryption on AWS)
- Sensitive fields (BYOB credentials) encrypted at application level before storing in `config_encrypted`
- Algorithm: AES-256-GCM (authenticated encryption — detects tampering)
- Per-record key derivation: HKDF(master_key, info=`"storage_config:{record_id}"`) — a compromised row does not expose keys for other rows
- Nonce: 12-byte random, prepended to the ciphertext, unique per `encrypt` call

```python
# backend/app/core/crypto.py — full implementation in 12_Storage_Abstraction.md §10.3

from app.core.crypto import encrypt_credentials, decrypt_credentials

# Encrypt before DB write (record_id is the storage_config UUID)
blob = encrypt_credentials(record_id=str(config.id), credentials={
    "access_key_id": "AKIA...",
    "secret_access_key": "wJalr...",
})
config.config_encrypted = blob   # BYTEA column

# Decrypt when building the provider at runtime
creds = decrypt_credentials(record_id=str(config.id), blob=config.config_encrypted)
```

What each provider encrypts — see **`12_Storage_Abstraction.md` §10.1–10.2** for the full per-provider credential schema table.

**Rules:**
- `STORAGE_CREDENTIAL_KEY` (32-byte hex) set as env var — fetched from KMS/Vault in production (Phase 6)
- `config_encrypted` is **never** included in any API response
- Console UI shows only `endpoint_url`, `bucket_name`, `region` and "Credentials saved ✓"
- `StorageConfig.__repr__` must mask `config_encrypted` — credentials must never appear in logs

**Layer 3: Customer-Managed Keys (Enterprise)**

For healthcare customers requiring maximum control:
- AWS KMS customer-managed CMK
- Azure Key Vault customer key
- Separate key per project (not per file — too expensive)
- Key rotation supported without re-encrypting files (envelope encryption)

### 7.2 In Transit Encryption

- TLS 1.3 enforced on all endpoints
- TLS 1.2 minimum (1.0 and 1.1 disabled)
- Certificate must be valid (no self-signed in production)
- SDK enforces TLS — no option to disable
- Internal service communication: TLS 1.3 (Kubernetes pod-to-pod via service mesh)
- Database connections: SSL required (sslmode=require)

```python
# Database connection string always includes SSL
DATABASE_URL = f"postgresql+asyncpg://{user}:{password}@{host}/{db}?ssl=require"

# Redis connection always includes TLS
REDIS_URL = f"rediss://{host}:6380"  # Note: rediss:// not redis://
```

### 7.3 Secrets Management

**Never in environment variables:**
- Database credentials
- API key signing secrets
- BYOB IAM credentials

**Use HashiCorp Vault or AWS Secrets Manager:**
```python
# secrets.py
import boto3

class SecretsManager:
    def __init__(self):
        self.client = boto3.client("secretsmanager", region_name="us-east-1")
        self._cache = {}

    def get_secret(self, secret_name: str) -> dict:
        if secret_name in self._cache:
            return self._cache[secret_name]

        response = self.client.get_secret_value(SecretId=secret_name)
        secret = json.loads(response["SecretString"])
        self._cache[secret_name] = secret
        return secret

secrets = SecretsManager()
DB_PASSWORD = secrets.get_secret("filenest/production/db_password")["password"]
```

---

## 8. Network Security

### 8.1 IP Allowlisting

Per-project IP allowlisting restricts which IP addresses can use the API:

```python
async def check_ip_allowlist(
    request_ip: str, project: Project
) -> None:
    allowed_ips = project.config.security.allowed_ips

    if not allowed_ips:
        return  # No restriction

    client_ip = ipaddress.ip_address(request_ip)

    for allowed in allowed_ips:
        network = ipaddress.ip_network(allowed, strict=False)
        if client_ip in network:
            return  # IP is allowed

    raise AuthorizationError(
        f"Request from {request_ip} is not in the project's IP allowlist"
    )
```

### 8.2 CORS Configuration

Per-project origin allowlisting for browser-based requests:

```python
from starlette.middleware.cors import CORSMiddleware

async def get_allowed_origins(project_id: str) -> list[str]:
    project = await get_project_cached(project_id)
    return project.config.security.allowed_origins or ["*"]

# Dynamic CORS — checked per request, not at startup
app.add_middleware(
    DynamicCORSMiddleware,
    get_allowed_origins=get_allowed_origins,
)
```

### 8.3 WAF Rules

AWS WAF / Azure WAF rules applied to all traffic:

| Rule | Action |
|------|--------|
| AWS-AWSManagedRulesCommonRuleSet | Block |
| AWS-AWSManagedRulesKnownBadInputsRuleSet | Block |
| AWS-AWSManagedRulesSQLiRuleSet | Block |
| Custom: Upload size enforcement | Block if Content-Length > 5GB |
| Custom: Header injection | Block |
| Custom: Rate limit by IP | Count + Alert at 1000 req/min |
| Custom: Geo-blocking (healthcare) | Block non-US IPs if data_residency=us |

### 8.4 DDoS Protection

- AWS Shield Standard on all ALBs (default)
- AWS Shield Advanced for healthcare tier (SLA-backed)
- CloudFront with geo-restriction as an optional layer
- Rate limiting at API Gateway level (in-process, before WAF)
- Connection limiting per IP at load balancer

---

## 9. Domain Verification

### 9.1 TXT Record Verification

For organizations that want to allow uploads from their own domains:

```
Customer action:
  Add TXT record: filenest-verify={verification_token} to DNS

FileNest verification:
  1. Generate verification_token = sha256(organization_id + domain + salt)
  2. Customer adds TXT record
  3. FileNest queries DNS: TXT filenest-verify at domain
  4. Compare values
  5. Mark domain as verified
  6. Verified domains added to allowed_origins automatically
```

```python
async def verify_domain(domain: str, org_id: str) -> bool:
    expected_token = hmac.new(
        settings.domain_verification_salt.encode(),
        f"{org_id}:{domain}".encode(),
        hashlib.sha256,
    ).hexdigest()

    # DNS lookup
    import dns.resolver
    try:
        answers = dns.resolver.resolve(domain, "TXT")
        for answer in answers:
            txt = answer.to_text().strip('"')
            if txt == f"filenest-verify={expected_token}":
                return True
    except dns.exception.DNSException:
        pass

    return False
```

### 9.2 CNAME Verification

For custom domain support (CDN/proxy use cases):

```
Customer CNAME: uploads.acme.com → acme.filenest.io
FileNest verifies CNAME points to FileNest infrastructure
Enables: branded upload URLs, custom SSL certificates
```

---

## 10. Threat Model

### 10.1 OWASP Top 10 Mitigations

| Threat | Mitigation |
|--------|-----------|
| A01 Broken Access Control | RBAC, scope checking, RLS, tenant isolation |
| A02 Cryptographic Failures | TLS 1.3, AES-256, bcrypt for keys, Vault for secrets |
| A03 Injection | SQLAlchemy ORM (parameterized), no raw SQL, input sanitization |
| A04 Insecure Design | Threat modeling, security review, immutable audit logs |
| A05 Security Misconfiguration | IaC (Terraform), security baseline, Kubernetes policies |
| A06 Vulnerable Components | Automated dependency scanning (pip-audit, npm audit), Dependabot |
| A07 Auth Failures | Rate limiting, bcrypt, token expiration, rotation |
| A08 Data Integrity Failures | Checksum verification, signed URLs, HMAC webhooks |
| A09 Logging Failures | Immutable audit logs, centralized logging, SIEM integration |
| A10 SSRF | Webhook URL validation, blocklist for private IPs, no outbound proxying |

### 10.2 File Upload Attack Vectors

**Vector 1: Malware Upload**
```
Attack: Upload malicious executable disguised as PDF
Mitigations:
  1. ClamAV scan on all uploads (blocks on infection)
  2. MIME type detection via magic bytes (not just extension or declared type)
  3. File quarantine (status=quarantined) prevents download
  4. Audit event: file.virus_detected
  5. Signed URLs only — no public access
```

**Vector 2: Polyglot File**
```
Attack: File that is valid as multiple formats (e.g., JPEG+ZIP)
Mitigations:
  1. Strict MIME type verification via libmagic
  2. Reject if declared MIME ≠ detected MIME (with allowlist for known divergence)
  3. No server-side execution of uploaded files
  4. Files served with Content-Disposition: attachment (prevents browser execution)
```

**Vector 3: XML/SVG with Embedded Scripts**
```
Attack: SVG containing JavaScript, XML with entity expansion (XXE)
Mitigations:
  1. SVG stripped of script tags before serving
  2. Content-Type forced on download (browser won't auto-execute)
  3. OCR/processing runs in isolated container
  4. XXE prevention in any XML parsing (ElementTree with defusedxml)
```

**Vector 4: Path Traversal**
```
Attack: Filename like ../../../etc/passwd
Mitigations:
  1. Filename sanitization before storage key construction
  2. Storage keys include UUID file_id (not user-controlled filename)
  3. User filename stored in DB column, not used in storage path
```

```python
def sanitize_filename(filename: str) -> str:
    """Remove path components and dangerous characters from filename."""
    # Strip path separators
    filename = os.path.basename(filename)
    # Replace null bytes
    filename = filename.replace("\x00", "")
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255 - len(ext)] + ext
    return filename or "unnamed_file"
```

**Vector 5: Storage Exhaustion**
```
Attack: Upload 10TB of data to exhaust storage quota
Mitigations:
  1. Content-Length validation before accepting upload
  2. Organization storage quota enforced at upload session creation
  3. Per-project max file size limit
  4. Rate limiting on upload session creation
  5. Billing alerts at 80%/90%/100% quota
```

### 10.3 API-Specific Threats

**Privilege Escalation:**
```
Attack: Use viewer-scoped key to call admin endpoint
Mitigation: Scope check is mandatory on every protected endpoint
  require_scope("admin") → raises AuthorizationError if not in scopes
```

**Token Theft:**
```
Attack: Steal API key from logs or config
Mitigations:
  1. API keys stripped from structured logs
  2. bcrypt hash stored, not plaintext
  3. Keys can be rotated immediately
  4. IP allowlist limits key usage geography
  5. Audit log shows all key usage (detect anomalies)
```

**Replay Attack (Webhooks):**
```
Attack: Intercept and replay webhook delivery
Mitigations:
  1. X-FileNest-Timestamp in each delivery
  2. Customer should reject deliveries older than 5 minutes
  3. HMAC-SHA256 signature covers payload + timestamp
  4. Unique delivery ID prevents exact duplicate processing
```

### 10.4 SSRF via Webhook URLs

```python
import ipaddress
from urllib.parse import urlparse

BLOCKED_PRIVATE_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local
    ipaddress.ip_network("::1/128"),          # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 private
]

async def validate_webhook_url(url: str) -> None:
    parsed = urlparse(url)

    # Must be HTTPS
    if parsed.scheme != "https":
        raise ValidationError("Webhook URL must use HTTPS")

    # Resolve hostname
    import socket
    try:
        ip_str = socket.gethostbyname(parsed.hostname)
    except socket.gaierror:
        raise ValidationError(f"Cannot resolve webhook hostname: {parsed.hostname}")

    ip = ipaddress.ip_address(ip_str)

    # Block private/internal IPs (SSRF prevention)
    for blocked_range in BLOCKED_PRIVATE_RANGES:
        if ip in blocked_range:
            raise ValidationError(
                f"Webhook URL resolves to internal IP ({ip}) — not allowed"
            )

    # Block metadata service IPs
    if str(ip) in ("169.254.169.254", "metadata.google.internal"):
        raise ValidationError("Webhook URL points to cloud metadata service — not allowed")
```

---

## 11. Audit and Detection

### 11.1 Security Events to Alert On

| Event | Alert Level | Action |
|-------|-------------|--------|
| 10+ auth failures from same IP in 5 min | HIGH | Block IP, notify security |
| API key used outside IP allowlist | MEDIUM | Log, notify admin |
| Admin action without prior auth | CRITICAL | Block, immediate alert |
| Virus detected in upload | HIGH | Quarantine, notify admin |
| Legal hold release on HIPAA project | HIGH | Require 2nd admin approval |
| WORM commit on file | INFO | Log with actor |
| Large batch download (>100 files/hour) | MEDIUM | Alert, rate limit |
| PHI detected in upload from unverified origin | HIGH | Flag for review |

### 11.2 Anomaly Detection Rules

```python
# Detect unusual download volume
async def check_download_anomaly(
    actor_id: str, project_id: str, window_minutes: int = 60
) -> None:
    key = f"download_count:{actor_id}:{project_id}"
    count = await redis.incr(key)

    if count == 1:
        await redis.expire(key, window_minutes * 60)

    if count > 500:  # More than 500 downloads/hour
        await security_alerter.alert(
            severity="MEDIUM",
            title="Unusual download volume detected",
            actor_id=actor_id,
            project_id=project_id,
            count=count,
        )
```

---

## 12. Secure Development Practices

### 12.1 Dependency Scanning

```yaml
# .github/workflows/security.yml
- name: Python security audit
  run: pip-audit --vulnerability-service osv

- name: Node security audit
  run: npm audit --audit-level high

- name: Container scanning
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: filenest/api:latest
    severity: HIGH,CRITICAL
```

### 12.2 Secret Scanning

- GitHub secret scanning enabled on all repositories
- `git-secrets` pre-commit hook
- Detect `fn_live_`, `fn_test_`, API key patterns

### 12.3 Security Headers

```python
# All API responses include security headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}
```

### 12.4 Penetration Testing Schedule

| Type | Frequency | Scope |
|------|-----------|-------|
| Automated DAST | Weekly | All API endpoints |
| Internal pen test | Quarterly | Full system |
| External pen test | Annually | Full system |
| Healthcare-specific security review | Semi-annually | PHI handling, HIPAA controls |
| SOC 2 readiness assessment | Annually | All controls |
