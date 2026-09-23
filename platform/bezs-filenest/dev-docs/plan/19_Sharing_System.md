# FileNest v1.0 — Sharing System

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Overview](#1-overview)
2. [Share Link Model](#2-share-link-model)
3. [Security Design](#3-security-design)
4. [API Specification](#4-api-specification)
5. [Access Flow](#5-access-flow)
6. [Password Protection](#6-password-protection)
7. [Download Proxy](#7-download-proxy)
8. [Database Schema](#8-database-schema)
9. [Compliance Constraints](#9-compliance-constraints)

---

## 1. Overview

The Sharing System provides **public, unauthenticated access** to files via time-limited share links. This is distinct from the signed URL system (which requires a valid FileNest API key to generate). Share links are designed for end-user sharing scenarios — sending a document to a client, sharing a file with someone outside the organization.

**Key properties:**
- No FileNest account required to access a share link
- Optional password protection
- Optional download count limit
- Configurable expiry (min 1 hour, max 30 days for non-Enterprise; unlimited for Enterprise)
- Per-project on/off toggle (Healthcare projects disable public sharing by default)
- Every access is logged in the audit trail
- Never exposes the underlying storage URL

---

## 2. Share Link Model

```python
class ShareLink(Base):
    __tablename__ = "share_links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("files.id"), nullable=False)
    org_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(nullable=False)

    # The public token — opaque, URL-safe, 32 bytes of entropy
    token: Mapped[str] = mapped_column(unique=True, nullable=False)

    # Optional password (bcrypt-hashed if set)
    password_hash: Mapped[str | None] = mapped_column(nullable=True)

    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    max_downloads: Mapped[int | None] = mapped_column(nullable=True)
    download_count: Mapped[int] = mapped_column(default=0)

    # Metadata
    label: Mapped[str | None] = mapped_column(nullable=True)  # e.g. "Sent to ACME Corp"
    allowed_email_domain: Mapped[str | None] = mapped_column(nullable=True)
    # If set, viewer must enter an email matching this domain before accessing

    active: Mapped[bool] = mapped_column(default=True)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

### 2.1 Public URL Format

```
https://share.filenest.io/s/{token}

Example:
https://share.filenest.io/s/xK9m2vPqR4nLwT8jY1cA3bZ6hE0sF7dU
```

The token is 32 bytes of cryptographically random data, URL-safe base64 encoded (43 characters). It contains no information about the org, project, or file — it is a pure opaque lookup key.

---

## 3. Security Design

### 3.1 Token Generation

```python
import secrets

def generate_share_token() -> str:
    # 32 bytes = 256 bits of entropy. Brute force is computationally infeasible.
    return secrets.token_urlsafe(32)
```

### 3.2 Enumeration Prevention

- Tokens are random 32-byte values — no sequential or predictable structure
- Lookup is by token only; no org/project/file IDs in the public URL
- Rate limit on `/s/{token}` endpoint: 30 requests/min per IP (prevents enumeration attempts)
- Invalid tokens return `HTTP 404` with the same response time as valid-but-expired tokens (timing side-channel prevention)

### 3.3 Password Brute Force Prevention

```python
async def check_share_password_attempts(token: str, redis: Redis) -> None:
    key = f"share_pw_attempts:{token}"
    attempts = await redis.incr(key)
    await redis.expire(key, 3600)  # Reset counter after 1 hour

    if attempts > 10:
        raise ShareLinkLocked(
            message="Too many incorrect password attempts. Link is temporarily locked.",
            retry_after=3600,
        )
```

After 10 failed password attempts within 1 hour, the link is locked for that IP for 1 hour. After 50 lifetime failed attempts across all IPs, the link is permanently revoked and the creator is notified.

---

## 4. API Specification

### 4.1 Create Share Link

```
POST /v1/files/{file_id}/share-links

Request:
{
  "expires_in_hours": 72,         // Required. Min 1, max 720 (30 days)
  "password": "optional-password",
  "max_downloads": 5,             // Optional. null = unlimited
  "label": "Sent to ACME Corp",   // Optional. For creator reference
  "allowed_email_domain": "acme.com"  // Optional
}

Response:
{
  "id": "sl_abc123",
  "file_id": "file_xyz",
  "url": "https://share.filenest.io/s/xK9m2vPqR4nLwT8jY1cA3bZ6hE0sF7dU",
  "token": "xK9m2vPqR4nLwT8jY1cA3bZ6hE0sF7dU",
  "password_protected": true,
  "expires_at": "2026-06-18T10:00:00Z",
  "max_downloads": 5,
  "download_count": 0,
  "created_at": "2026-06-15T10:00:00Z"
}
```

### 4.2 List Share Links for a File

```
GET /v1/files/{file_id}/share-links

Response:
{
  "data": [
    {
      "id": "sl_abc",
      "url": "https://share.filenest.io/s/...",
      "label": "Sent to ACME Corp",
      "expires_at": "2026-06-18T10:00:00Z",
      "download_count": 3,
      "max_downloads": 5,
      "active": true
    }
  ]
}
```

### 4.3 Revoke Share Link

```
DELETE /v1/share-links/{share_link_id}

Response: 204 No Content
```

### 4.4 Public Access Endpoint (No Auth Required)

```
GET /s/{token}
→ Returns share link metadata (filename, size, expiry, password_required)
   Does NOT return file content yet

POST /s/{token}/access
Body: { "password": "optional" }
→ Returns a short-lived (15 min) access token for this share link

GET /s/{token}/download?access_token={access_token}
→ Redirects to a signed storage URL (or proxies stream for large files)
```

---

## 5. Access Flow

```
User visits https://share.filenest.io/s/{token}
  ↓
Share page frontend loads
  ↓
GET /s/{token}
  ← { filename, size, expires_at, password_required: true/false }
  ↓
If password_required:
  User enters password
  POST /s/{token}/access  { "password": "..." }
  ← { access_token: "short-lived JWT" }
  ↓
If not password_required:
  POST /s/{token}/access  (empty body)
  ← { access_token: "short-lived JWT" }
  ↓
GET /s/{token}/download?access_token={access_token}
  ← 302 Redirect → signed storage URL (valid 60 seconds)
  ↓
Browser downloads file directly from storage
```

### 5.1 Access Token (Short-Lived JWT)

```python
def create_share_access_token(share_link_id: str, file_id: str) -> str:
    payload = {
        "sub": share_link_id,
        "file_id": file_id,
        "type": "share_access",
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
```

The 15-minute access token allows the user to initiate the download without re-entering the password. It is single-use — validated against a Redis set of consumed tokens.

---

## 6. Password Protection

```python
class ShareLinkService:

    async def verify_password(
        self,
        share_link: ShareLink,
        password: str,
        client_ip: str,
        redis: Redis,
    ) -> None:
        await check_share_password_attempts(share_link.token, redis)

        if share_link.password_hash is None:
            return  # No password set

        if not bcrypt.checkpw(
            password.encode(), share_link.password_hash.encode()
        ):
            raise ShareLinkPasswordIncorrect(
                message="Incorrect password.",
            )

    async def create(
        self,
        file_id: str,
        expires_in_hours: int,
        password: str | None,
        max_downloads: int | None,
        label: str | None,
        creator_id: str,
        db: AsyncSession,
    ) -> ShareLink:
        password_hash = None
        if password:
            password_hash = bcrypt.hashpw(
                password.encode(), bcrypt.gensalt(rounds=10)
            ).decode()

        token = generate_share_token()

        share_link = ShareLink(
            id=new_id("sl"),
            file_id=file_id,
            token=token,
            password_hash=password_hash,
            expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours),
            max_downloads=max_downloads,
            label=label,
            created_by=creator_id,
        )
        db.add(share_link)
        await db.commit()
        return share_link
```

---

## 7. Download Proxy

For files where direct signed URL redirect is not appropriate (e.g., very large files where the user needs streaming, or when the storage provider URL should not be exposed at all), FileNest can proxy the download:

```python
@router.get("/s/{token}/stream")
async def stream_shared_file(
    token: str,
    access_token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
):
    share_link = await validate_share_access_token(access_token, token, db)
    file = await db.get(File, share_link.file_id)

    await increment_download_count(share_link, db)
    await log_share_access(share_link, file, request.client.host, db)

    async def generate():
        async for chunk in storage.download_stream(file.storage_key):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type=file.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{file.original_filename}"',
            "Content-Length": str(file.size),
        },
    )
```

---

## 8. Database Schema

```sql
CREATE TABLE share_links (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id               UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    org_id                UUID NOT NULL REFERENCES organizations(id),
    project_id            UUID NOT NULL REFERENCES projects(id),
    created_by            UUID NOT NULL REFERENCES users(id),
    token                 CHAR(43) UNIQUE NOT NULL,  -- URL-safe base64(32 bytes)
    password_hash         TEXT,
    expires_at            TIMESTAMPTZ,
    max_downloads         INT,
    download_count        INT NOT NULL DEFAULT 0,
    label                 TEXT,
    allowed_email_domain  TEXT,
    active                BOOLEAN NOT NULL DEFAULT TRUE,
    revoked_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_share_links_token ON share_links (token);
CREATE INDEX idx_share_links_file ON share_links (file_id);
CREATE INDEX idx_share_links_active ON share_links (active, expires_at)
  WHERE active = TRUE;

-- Access log for share links (separate from main audit_logs for volume reasons)
CREATE TABLE share_link_accesses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_link_id   UUID NOT NULL REFERENCES share_links(id),
    file_id         UUID NOT NULL,
    ip_address      INET NOT NULL,
    user_agent      TEXT,
    accessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (accessed_at);
```

---

## 9. Compliance Constraints

### 9.1 Healthcare Projects

Public sharing is **disabled by default** on Healthcare (`healthcare` domain) projects. HIPAA requires that PHI access be access-controlled and logged to a specific individual. Anonymous share links do not satisfy this requirement.

```python
async def validate_share_creation(file: File, project: Project) -> None:
    profile = project.config["compliance"]["profile"]
    sharing_config = project.config.get("sharing", {})

    if profile == "healthcare":
        if not sharing_config.get("allow_public_sharing", False):
            raise ComplianceError(
                code="public_sharing_disabled",
                message=(
                    "Public share links are disabled for Healthcare projects. "
                    "Enable public sharing explicitly in project configuration, "
                    "with acknowledgment that PHI may be accessed without authentication."
                ),
            )

    if file.legal_hold_active:
        raise ComplianceError(
            code="legal_hold_prevents_sharing",
            message="Files under legal hold cannot be shared publicly.",
        )

    if file.classification in {"phi_confirmed", "classified", "restricted"}:
        raise ComplianceError(
            code="file_classification_prevents_sharing",
            message=f"Files classified as '{file.classification}' cannot be shared publicly.",
        )
```

### 9.2 Share Links in Audit Log

Every share link creation, access, and revocation is written to the main `audit_logs` table:

```python
await audit_logger.log(
    action="share_link.accessed",
    actor_id=f"anonymous:{client_ip}",
    actor_type="anonymous",
    resource_type="file",
    resource_id=str(file.id),
    org_id=share_link.org_id,
    project_id=share_link.project_id,
    result="success",
    metadata={
        "share_link_id": str(share_link.id),
        "ip_address": client_ip,
        "download_count": share_link.download_count,
    },
    db=db,
)
```
