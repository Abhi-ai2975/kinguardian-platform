# OAuth2 Authorization Server

**FHIR Spec:** https://www.hl7.org/fhir/R4/security.html#oauth  
**Medplum reference:** `packages/server/src/auth/`

---

## Why We Need OAuth2

Our current auth: validate a JWT signed by an external IAM. This works for our own apps  
but breaks for:
- Third-party SMART apps (EHR-connected apps)
- Patient portal access on behalf of patients
- Practitioner cross-organization access
- Machine-to-machine API access with scoped tokens
- Token refresh without full re-login

OAuth2 is the industry standard and a **requirement** for FHIR compliance in the US  
(21st Century Cures Act / ONC rules).

---

## OAuth2 Grant Types We Need

### 1. Authorization Code + PKCE

The standard interactive login flow. Used by:
- Web apps (our future EMR UI)
- Mobile apps
- SMART on FHIR third-party apps

```
User → App → /authorize?client_id=...&response_type=code&code_challenge=...
    → IAM login screen
    → Redirect to app with ?code=abc123
App → POST /token { grant_type: "authorization_code", code: "abc123", code_verifier: "..." }
    → { access_token, refresh_token, token_type: "Bearer", scope, patient }
```

### 2. Client Credentials

Machine-to-machine. Used by:
- Our Pulse orchestrator (backend-to-backend API calls)
- Lab systems, EHR integrations
- Scheduled jobs

```
Service → POST /token { grant_type: "client_credentials", client_id, client_secret, scope }
        → { access_token, token_type: "Bearer", scope, expires_in }
```

### 3. Refresh Token

Renew an expired access token without re-login.

```
App → POST /token { grant_type: "refresh_token", refresh_token: "rt_xyz" }
    → { access_token, refresh_token, scope }
```

---

## OAuth2 Endpoints

```
GET  /oauth2/authorize          — Authorization endpoint (redirect user here)
POST /oauth2/token              — Token endpoint
POST /oauth2/revoke             — Revoke an access or refresh token
GET  /oauth2/userinfo           — OpenID Connect userinfo endpoint
GET  /.well-known/openid-configuration — OIDC discovery
GET  /.well-known/jwks.json     — Public key for JWT verification
```

---

## Database Schema

```sql
-- OAuth2 Clients (our apps + third-party apps)
CREATE TABLE oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL UNIQUE,
    client_secret_hash TEXT,                  -- NULL for public clients
    client_type TEXT NOT NULL DEFAULT 'confidential',  -- 'public', 'confidential'
    name TEXT NOT NULL,
    redirect_uris TEXT[] NOT NULL,
    allowed_scopes TEXT[] NOT NULL,
    allowed_grant_types TEXT[] NOT NULL,
    pkce_required BOOLEAN DEFAULT TRUE,
    org_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Authorization Codes (short-lived, single-use)
CREATE TABLE auth_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id),
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT,
    code_challenge_method TEXT DEFAULT 'S256',
    patient_id TEXT,          -- SMART context
    encounter_id TEXT,        -- SMART context
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh Tokens (long-lived)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    patient_id TEXT,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    patient_id TEXT,
    ip_address INET,
    user_agent TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Token Structure

Our access tokens are JWTs signed with our own private key:

```json
{
  "iss": "https://fhir.example.com",
  "sub": "user-uuid",
  "aud": "https://fhir.example.com",
  "exp": 1705320000,
  "iat": 1705316400,
  "jti": "token-uuid",
  "scope": "patient/*.read user/Practitioner.read",
  "client_id": "my-emr-app",
  "org_id": "org-uuid",
  "patient": "Patient/10001",
  "fhirUser": "Practitioner/30001"
}
```

---

## Implementation Plan

### Step 1 — Key Management

```python
# app/core/jwt_keys.py
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

class JWTKeyManager:
    def __init__(self, private_key_pem: str):
        self.private_key = serialization.load_pem_private_key(private_key_pem.encode(), None)
        self.public_key = self.private_key.public_key()

    def sign_token(self, claims: dict) -> str:
        return jwt.encode(claims, self.private_key, algorithm="RS256", headers={"kid": self.key_id})

    def jwks(self) -> dict:
        """Return public key in JWKS format for /.well-known/jwks.json."""
        ...
```

### Step 2 — Authorization Endpoint

```python
# app/routers/oauth2.py

@router.get("/oauth2/authorize")
async def authorize(
    response_type: str,
    client_id: str,
    redirect_uri: str,
    scope: str,
    state: str,
    code_challenge: str | None = None,
    code_challenge_method: str | None = None,
    launch: str | None = None,  # SMART EHR launch token
    svc=Depends(get_oauth_service),
):
    # 1. Validate client
    client = await svc.get_client(client_id)
    if redirect_uri not in client.redirect_uris:
        raise HTTPException(400, "Invalid redirect_uri")
    # 2. If already logged in (session), skip login page
    # 3. Otherwise redirect to login page with auth params
    return RedirectResponse(f"/login?{encode_auth_params(...)}")
```

### Step 3 — Token Endpoint

```python
@router.post("/oauth2/token")
async def token(form: OAuth2TokenRequest = Depends(), svc=Depends(get_oauth_service)):
    if form.grant_type == "authorization_code":
        return await svc.exchange_code(form)
    elif form.grant_type == "client_credentials":
        return await svc.client_credentials(form)
    elif form.grant_type == "refresh_token":
        return await svc.refresh(form)
    raise HTTPException(400, "Unsupported grant_type")
```

### Step 4 — Scope Enforcement Middleware

```python
# app/auth/scope_middleware.py

SCOPE_MAP = {
    "GET /Patient": "patient/*.read",
    "POST /Patient": "patient/*.write",
    ...
}

async def check_scope(request: Request, call_next):
    token_scopes = request.state.user.get("scope", "").split()
    required_scope = infer_required_scope(request.method, request.url.path)
    if required_scope and required_scope not in token_scopes:
        raise ForbiddenError(f"Scope {required_scope} required")
    return await call_next(request)
```

---

## PKCE Security

PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks.  
All public clients (SPAs, mobile) MUST use PKCE.

```python
import hashlib, base64, secrets

# Client generates:
code_verifier = secrets.token_urlsafe(64)
code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode()).digest()
).rstrip(b"=").decode()

# Token exchange: verify
def verify_pkce(code_verifier: str, stored_challenge: str) -> bool:
    computed = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return secrets.compare_digest(computed, stored_challenge)
```
