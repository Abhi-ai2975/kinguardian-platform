# SMART on FHIR — Complete Implementation Guide

> Full implementation of SMART App Launch v2, Backend Services, PKCE, scope enforcement, and integration with the FHIR server + Pulse middleware stack.
>
> **IAM-agnostic** — this document describes the contracts and patterns. The auth server (BetterAuth, Auth0, Cognito, Okta, or any OAuth2 + OIDC provider) must satisfy these contracts. No framework-specific configuration is prescribed here.

---

## What SMART on FHIR Is

SMART on FHIR (Substitutable Medical Applications, Reusable Technologies) is the **authorization layer** that sits on top of OAuth2 / OpenID Connect and makes it clinical-context-aware. It defines:

1. **How apps discover** the authorization server (`/.well-known/smart-configuration`)
2. **How apps launch** — EHR-embedded launch vs. standalone launch
3. **What scopes** control access (patient context, user context, system context)
4. **How backend services** authenticate without user interaction
5. **What context** is carried in the token (which patient, which encounter)

SMART App Launch v2 (HL7 SMART IG v2.0.0+) is required by US Core v7+ and ONC (g)(10).

---

## 1. IAM / Auth Server Contract

Your IAM service must satisfy these contracts. The FHIR server and Pulse only care about the token contract — not how the token was issued or which auth framework produced it.

### 1.1 Required OAuth2 / OIDC Endpoints

| Endpoint | Purpose |
|---|---|
| JWKS URL | Public keys for JWT signature verification — Pulse fetches and caches this |
| `GET /authorize` | Authorization code flow + PKCE |
| `POST /token` | Code exchange, `client_credentials`, `refresh_token` grants |
| `POST /revoke` | Token revocation — required for Inferno test suite |
| `POST /introspect` (optional) | Token active status for opaque tokens |
| Dynamic registration (RFC 7591) | Optional — for third-party SMART app onboarding |

### 1.2 Required JWT Claims

The access token the IAM issues **must** contain these claims for the FHIR server and Pulse to function:

```json
{
  "sub": "user-uuid",
  "iss": "https://your-iam.example.com",
  "aud": "fhir-server",
  "exp": 1800000000,
  "iat": 1799996400,
  "scope": "openid patient/Patient.rs user/Observation.cruds",
  "roles": ["physician"],
  "activeOrganizationId": "org-uuid",
  "launch_response": {
    "patient": "10001",
    "encounter": "20001"
  },
  "fhirUser": "Practitioner/30001"
}
```

**Key points:**

- `scope` is space-separated SMART v2 granular scopes. Pulse extracts and enforces these independently of the IAM.
- `activeOrganizationId` is required for multi-tenancy. Every FHIR resource row is scoped to this org.
- `roles` is used by Pulse's RBAC engine. The claim name is configurable via `IAM_ROLES_CLAIM`.
- `launch_response` is only present when the SMART EHR launch flow was used.
- `fhirUser` links the authenticated user to their FHIR resource (Practitioner, Patient, RelatedPerson).

### 1.3 SMART Scope Registration

Your IAM must support registering custom scopes so that tokens carry SMART v2 granular scopes. All of the following must be registerable as valid scope strings:

```
# Patient context — data restricted to the launched patient
patient/Patient.r        patient/Patient.rs       patient/Patient.cruds
patient/Observation.rs   patient/Condition.rs     patient/MedicationRequest.rs
patient/AllergyIntolerance.rs  patient/Immunization.rs  patient/Encounter.rs
patient/DiagnosticReport.rs    patient/DocumentReference.rs  patient/CarePlan.rs
patient/*.r              patient/*.rs             patient/*.cruds

# User context — data for the authenticated practitioner's accessible records
user/Patient.cruds       user/Practitioner.cruds  user/MedicationRequest.cruds
user/Encounter.cruds     user/*.r                 user/*.rs    user/*.cruds

# System context — backend services, no user interaction
system/Patient.rs        system/*.rs              system/*.cruds

# Launch context
launch             launch/patient       launch/encounter
```

The FHIR server reads the `scope` claim from validated tokens — it does not call the IAM to re-verify scope validity at request time.

### 1.4 Required Client Types

| Client | Grant Type | Auth Method | Purpose |
|---|---|---|---|
| Clinician web app | `authorization_code` | PKCE (S256) | Browser-based portal |
| Mobile app | `authorization_code` | PKCE (S256) | Native mobile |
| Pulse orchestrator | `client_credentials` | `private_key_jwt` (RFC 7523) | System-level FHIR calls |
| AI gateway agents | `client_credentials` | `private_key_jwt` (RFC 7523) | AI system access |
| Patient portal | `authorization_code` | PKCE (S256) | Standalone patient launch |
| Third-party SMART apps | `authorization_code` | PKCE (S256) | External SMART integrations |
| Inferno test client | `authorization_code` | PKCE (S256) | Conformance testing |

### 1.5 IAM vs. Pulse vs. FHIR Server Responsibilities

| Concern | IAM | Pulse | FHIR Server |
|---|---|---|---|
| User authentication (password, MFA, SSO, OAuth providers) | ✓ | — | — |
| Token issuance + signing | ✓ | — | — |
| PKCE validation during auth code flow | ✓ | — | — |
| SMART scope registration | ✓ | — | — |
| Token expiry + refresh | ✓ | — | — |
| JWT signature verification | — | ✓ via JWKS | — |
| SMART scope enforcement | — | ✓ | — |
| RBAC (role → resource → action) | — | ✓ | — |
| ABAC (care team, consent, sensitivity) | — | ✓ | — |
| Row-level tenancy (user_id + org_id filter) | — | — | ✓ reads from JWT claims |

---

## 2. SMART Discovery Endpoint

Add to the FHIR server (or proxy via nginx). All URLs are driven by settings — no hardcoded IAM paths:

```python
# app/routers/smart_config.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.core.config import settings

router = APIRouter()

@router.get(
    "/.well-known/smart-configuration",
    include_in_schema=False,
    response_class=JSONResponse,
)
async def smart_configuration():
    return JSONResponse(
        content={
            "issuer": settings.IAM_ISSUER,
            "jwks_uri": settings.IAM_JWKS_URL,
            "authorization_endpoint": settings.IAM_AUTH_ENDPOINT,
            "token_endpoint": settings.IAM_TOKEN_ENDPOINT,
            "token_endpoint_auth_methods_supported": [
                "private_key_jwt",
                "client_secret_basic",
                "client_secret_post",
            ],
            "revocation_endpoint": settings.IAM_REVOKE_ENDPOINT,
            "introspection_endpoint": settings.IAM_INTROSPECT_ENDPOINT,
            "grant_types_supported": ["authorization_code", "client_credentials"],
            "registration_endpoint": settings.IAM_REGISTRATION_ENDPOINT,
            "scopes_supported": [
                "openid", "profile", "email", "offline_access",
                "launch", "launch/patient", "launch/encounter",
                "patient/*.r", "patient/*.rs", "patient/*.cruds",
                "user/*.r", "user/*.rs", "user/*.cruds",
                "system/*.r", "system/*.rs", "system/*.cruds",
            ],
            "response_types_supported": ["code"],
            "response_modes_supported": ["query"],
            "code_challenge_methods_supported": ["S256"],
            "capabilities": [
                "launch-ehr", "launch-standalone", "authorize-post",
                "client-public", "client-confidential-symmetric",
                "client-confidential-asymmetric",
                "context-banner", "context-style",
                "context-ehr-patient", "context-ehr-encounter",
                "context-standalone-patient",
                "permission-offline", "permission-patient",
                "permission-user", "permission-v2", "smart-app-state",
            ],
        },
        headers={"Content-Type": "application/json"},
    )
```

Mount it at root:
```python
# app/main.py
from app.routers.smart_config import router as smart_config_router
app.include_router(smart_config_router)  # no prefix — must be at root
```

---

## 3. SMART App Launch Flows

### 3.1 EHR Launch (Embedded App)

The EHR portal launches the SMART app with a short-lived `launch` token encoding patient/encounter context. The IAM validates this token during the auth code flow and injects the context into the resulting JWT.

```
EHR Portal                  IAM / Auth Server             SMART App
    │                             │                            │
    │  1. User opens patient      │                            │
    │     chart, clicks           │                            │
    │     "Open SMART App"        │                            │
    │                             │                            │
    │  2. POST /smart/launch      │                            │
    │  → Pulse creates launch     │                            │
    │    token (60s TTL, Redis)   │                            │
    │  ← returns { launch, iss }  │                            │
    │                             │                            │
    │  3. Redirect app:           │                            │
    │  ?iss=https://fhir.platform │                            │
    │  &launch={launch_token}     │                            │
    │────────────────────────────────────────────────────────► │
    │                             │                            │
    │                             │  4. App fetches            │
    │                             │     /.well-known/smart-cfg │
    │                             │◄───────────────────────────│
    │                             │                            │
    │                             │  5. App builds auth URL    │
    │                             │◄───────────────────────────│
    │                             │  GET /authorize?           │
    │                             │    scope=launch openid     │
    │                             │      patient/Patient.rs    │
    │                             │    launch={launch_token}   │
    │                             │    code_challenge={S256}   │
    │                             │                            │
    │  6. IAM validates launch    │                            │
    │     token (see §3.1.1)      │                            │
    │     injects patient context │                            │
    │─────────────────────────────►                            │
    │                             │  7. Redirect with code     │
    │                             │───────────────────────────►│
    │                             │                            │
    │                             │  8. POST /token            │
    │                             │◄───────────────────────────│
    │                             │     code + code_verifier   │
    │                             │───────────────────────────►│
    │                             │  { access_token with       │
    │                             │    launch_response.patient }
    └─────────────────────────────┴────────────────────────────┘
```

#### Pulse Launch API

```python
# pulse/routers/smart_launch.py

@router.post("/smart/launch", operation_id="create_ehr_launch_context")
async def create_ehr_launch(
    body: EHRLaunchRequest,
    auth: AuthContext = Depends(get_auth_context),
):
    """
    Called by EHR portal before redirecting to a SMART app.
    Creates a launch token encoding patient/encounter context.
    Stored in Redis with a 60-second TTL — single use.
    """
    launch_token = secrets.token_urlsafe(32)

    launch_context = {
        "patient_id": body.patient_id,
        "encounter_id": body.encounter_id,
        "practitioner_id": auth.user_id,
        "org_id": auth.org_id,
        "created_at": datetime.utcnow().isoformat(),
    }

    await redis.setex(
        f"smart_launch:{launch_token}",
        60,
        json.dumps(launch_context),
    )

    return JSONResponse({"launch": launch_token, "iss": settings.FHIR_BASE_URL})
```

#### 3.1.1 IAM Launch Token Validation (Three Patterns)

The IAM must validate the `launch` parameter before issuing the authorization code and inject the patient context into the resulting access token. The implementation depends on what extension points your IAM exposes:

| Pattern | How It Works | Trade-off |
|---|---|---|
| **Callback hook** | During auth flow, IAM calls `GET /smart/launch/validate?token=X` on Pulse; Pulse returns `{ patient_id, org_id }`; IAM injects claims | Clean separation; requires IAM to support pre-token hooks |
| **Shared Redis** | IAM reads `smart_launch:{token}` from the same Redis instance Pulse wrote to; extracts and injects context | Simple; requires IAM to have Redis access |
| **Pre-auth resolution** | EHR resolves launch context via Pulse API first, then passes resolved `patient_id` as a login hint to the IAM; no second validation step needed | Simpler IAM integration; less secure (hint can be spoofed without re-validation) |

The Pulse-side implementation (`POST /smart/launch`) is identical regardless of which pattern the IAM uses. Choose based on what hooks your IAM exposes.

---

### 3.2 Standalone Launch

App launches from outside the EHR (e.g., patient portal, mobile app). No `launch` parameter — the IAM resolves patient context during login.

```
Patient App                  IAM / Auth Server            FHIR Server
    │                             │                            │
    │  1. App fetches             │                            │
    │     /.well-known/smart-cfg  ────────────────────────────►│
    │  ◄──────────────────────────────────────────────────────  │
    │                             │                            │
    │  2. PKCE: generate          │                            │
    │     verifier + challenge    │                            │
    │                             │                            │
    │  3. GET /authorize?         │                            │
    │     scope=openid            │                            │
    │       launch/patient        │                            │
    │       patient/Patient.r     │                            │
    │     code_challenge={S256}   │                            │
    │────────────────────────────►│                            │
    │                             │                            │
    │  4. User authenticates      │                            │
    │  5. Consent screen shown    │                            │
    │  6. Redirect with code      │                            │
    │◄────────────────────────────│                            │
    │                             │                            │
    │  7. POST /token             │                            │
    │     code + code_verifier    │                            │
    │────────────────────────────►│                            │
    │◄────────────────────────────│                            │
    │  { access_token,            │                            │
    │    patient: "10001",  ←── IAM resolves from user profile │
    │    refresh_token }          │                            │
    └─────────────────────────────┴────────────────────────────┘
```

When `launch/patient` scope is requested and the authenticated user is in the patient role, the IAM must populate the `patient` field in the token response body (SMART v2 spec §7.3) and/or in the `launch_response.patient` JWT claim.

---

### 3.3 SMART Backend Services (System-Level Access)

Used by Pulse orchestrator, HL7v2 adapters, bulk export jobs — no user interaction. Implements RFC 7523 (JWT Bearer client assertion). This pattern is IAM-agnostic and works with any OAuth2 server that supports `private_key_jwt` client authentication.

```python
# pulse/auth/backend_services.py
import jwt
import time
import uuid
from cryptography.hazmat.primitives import serialization

class SMARTBackendAuth:
    """
    SMART Backend Services — RFC 7523 JWT Bearer client assertion.
    The client proves identity with a private key, no user interaction needed.
    """

    def __init__(self, client_id: str, private_key_path: str, token_endpoint: str):
        self.client_id = client_id
        self.token_endpoint = token_endpoint
        with open(private_key_path, "rb") as f:
            self.private_key = serialization.load_pem_private_key(f.read(), password=None)

    def _build_client_assertion(self) -> str:
        now = int(time.time())
        payload = {
            "iss": self.client_id,
            "sub": self.client_id,
            "aud": self.token_endpoint,
            "jti": str(uuid.uuid4()),    # unique ID — prevents replay
            "iat": now,
            "exp": now + 300,
        }
        return jwt.encode(payload, self.private_key, algorithm="RS384")

    async def get_access_token(self, scopes: list[str]) -> str:
        assertion = self._build_client_assertion()

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.token_endpoint,
                data={
                    "grant_type": "client_credentials",
                    "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                    "client_assertion": assertion,
                    "scope": " ".join(scopes),
                },
            )
            resp.raise_for_status()
            return resp.json()["access_token"]
```

Register the **public key** with your IAM for the `pulse-orchestrator` client. The IAM then accepts JWT client assertions signed by the corresponding private key. Registration method (JWKS URL, PEM import, admin API) is IAM-specific.

---

## 4. JWT Validation Middleware

Implemented in Pulse (validates tokens from API consumers). The FHIR server itself is a private data plane and does not re-validate — it trusts that Pulse has already verified the token.

This implementation is IAM-agnostic — it only needs the JWKS URL:

```python
# pulse/auth/jwt_middleware.py
import jwt
from jwt import PyJWKClient
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pulse.core.config import settings

EXCLUDED_PATHS = frozenset({"/health", "/health/ready", "/favicon.ico"})
EXCLUDED_PREFIXES = ("/docs", "/redoc")


class JWTAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # Works with any OIDC-compliant IAM — just needs the JWKS URL
        self._jwks_client = PyJWKClient(
            settings.IAM_JWKS_URL,
            cache_jwk_set=True,
            lifespan=300,
        )

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path in EXCLUDED_PATHS or any(path.startswith(p) for p in EXCLUDED_PREFIXES):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return self._error(401, "security", "Missing or invalid Authorization header")

        token = auth_header[7:]

        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "RS384", "ES256", "ES384"],
                audience=settings.IAM_AUDIENCE,
                issuer=settings.IAM_ISSUER,
                options={"verify_exp": True, "verify_aud": True},
            )
        except jwt.ExpiredSignatureError:
            return self._error(401, "security", "Token expired")
        except jwt.InvalidAudienceError:
            return self._error(401, "security", "Token audience mismatch")
        except jwt.InvalidIssuerError:
            return self._error(401, "security", "Token issuer mismatch")
        except jwt.InvalidTokenError as e:
            return self._error(401, "security", "Invalid token")

        request.state.user = payload

        # Extract SMART scopes as a set for O(1) lookups
        scope_str = payload.get("scope", "")
        request.state.scopes = set(scope_str.split()) if scope_str else set()

        # Extract SMART launch context
        launch = payload.get("launch_response", {})
        request.state.smart_patient = launch.get("patient")
        request.state.smart_encounter = launch.get("encounter")

        return await call_next(request)

    @staticmethod
    def _error(status: int, code: str, msg: str) -> JSONResponse:
        return JSONResponse(
            status_code=status,
            content={
                "resourceType": "OperationOutcome",
                "issue": [{"severity": "error", "code": code, "diagnostics": msg}],
            },
        )
```

---

## 5. SMART Scope Enforcement

Enforced in Pulse — not in the FHIR data layer. The FHIR server trusts that Pulse has already checked scopes before forwarding requests.

```python
# pulse/auth/smart.py

METHOD_TO_ACTION = {
    "GET":    "r",
    "POST":   "c",
    "PUT":    "u",
    "PATCH":  "u",
    "DELETE": "d",
}

def _required_scopes(resource_type: str, method: str) -> list[set[str]]:
    """
    Returns a list of scope sets — request passes if ANY set is fully present in the token.
    Implements SMART v2 wildcard and specific-resource rules.
    """
    action = METHOD_TO_ACTION.get(method, "r")
    rt = resource_type

    return [
        {f"patient/{rt}.{action}"}, {f"patient/{rt}.cruds"},
        {f"patient/*.{action}"}, {f"patient/*.cruds"},
        {f"user/{rt}.{action}"}, {f"user/{rt}.cruds"},
        {f"user/*.{action}"}, {f"user/*.cruds"},
        {f"system/{rt}.{action}"}, {f"system/{rt}.cruds"},
        {f"system/*.{action}"}, {f"system/*.cruds"},
    ]


def require_smart_scope(resource_type: str):
    """
    FastAPI dependency factory.
        @router.get("/{id}", dependencies=[Depends(require_smart_scope("Patient"))])
    """
    async def _check(request: Request):
        token_scopes: set[str] = getattr(request.state, "scopes", set())
        method = request.method

        for required_set in _required_scopes(resource_type, method):
            if required_set.issubset(token_scopes):
                return

        raise HTTPException(
            status_code=403,
            detail={
                "resourceType": "OperationOutcome",
                "issue": [{
                    "severity": "error",
                    "code": "forbidden",
                    "diagnostics": (
                        f"Insufficient scope for {method} on {resource_type}. "
                        f"Token scopes: {sorted(token_scopes)}"
                    ),
                }],
            },
        )

    return _check
```

---

## 6. Patient-Scoped Context Enforcement

When a token carries `launch_response.patient`, all resource access must be restricted to that patient:

```python
# pulse/middleware/patient_context.py

class PatientContextMiddleware(BaseHTTPMiddleware):
    """
    If the token contains a patient launch context, enforce that all resource
    requests belong to that patient. Prevents a patient-scoped token from
    accessing another patient's data.
    """

    async def dispatch(self, request: Request, call_next):
        smart_patient = getattr(request.state, "smart_patient", None)
        scopes = getattr(request.state, "scopes", set())

        is_patient_scoped = any(s.startswith("patient/") for s in scopes)

        if smart_patient and is_patient_scoped:
            request.state.patient_context_id = int(smart_patient)

        return await call_next(request)
```

Pulse uses this when forwarding requests — it adds the patient context as an internal header or injects it into the forwarded query parameters before the FHIR server processes the request.

---

## 7. Token Refresh Flow

Standard OAuth2 refresh token flow — IAM-agnostic:

```python
# pulse/auth/token_refresh.py

class TokenRefreshService:
    async def refresh(self, session_id: str) -> dict:
        session = await self.session_manager.get_session(session_id)
        if not session:
            raise SessionExpiredError("Session not found or expired")

        refresh_token = session.get("refresh_token")
        if not refresh_token:
            raise SessionExpiredError("No refresh token in session")

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                settings.IAM_TOKEN_ENDPOINT,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.IAM_CLIENT_ID,
                    "client_secret": settings.IAM_CLIENT_SECRET,
                },
            )

        if resp.status_code == 400:
            # Refresh token expired — force re-login
            await self.session_manager.delete_session(session_id)
            raise SessionExpiredError("Refresh token expired. Please log in again.")

        resp.raise_for_status()
        new_tokens = resp.json()
        new_payload = jwt.decode(new_tokens["access_token"], options={"verify_signature": False})

        await self.session_manager.update_session(
            session_id,
            user_info=new_payload,
            tokens=new_tokens,
        )

        return {
            "access_token": new_tokens["access_token"],
            "expires_in": new_tokens.get("expires_in", 300),
        }
```

---

## 8. SMART App Registration

Third-party SMART apps are registered via Pulse. Pulse delegates actual client creation to an `IamAdminClient` abstraction — the implementation is IAM-specific, but the Pulse API contract is stable:

```python
# pulse/routers/smart_register.py

@router.post(
    "/smart/register",
    operation_id="register_smart_app",
    summary="Register a third-party SMART app (RFC 7591)",
)
async def register_smart_app(
    body: SmartAppRegistrationRequest,
    auth: AuthContext = Depends(require_admin),
):
    """
    Register a new SMART app client. Delegates client creation to the IAM
    via IamAdminClient. Stores the registration locally (pending approval).
    """
    client_id = str(uuid.uuid4())

    # IamAdminClient is an interface — inject the correct implementation for your IAM
    client_secret = await iam_admin.create_client(
        client_id=client_id,
        app_name=body.app_name,
        redirect_uris=body.redirect_uris,
        requested_scopes=body.requested_scopes,
        confidential=body.confidential,
        pkce_required=True,
    )

    # Store in local registry — requires admin approval before activation
    await app_registry.register(
        client_id=client_id,
        org_id=auth.org_id,
        app_name=body.app_name,
        approved=False,
    )

    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "status": "pending_approval",
    }
```

`IamAdminClient` defines a standard interface (`create_client`, `update_client`, `delete_client`, `rotate_secret`). Each IAM provider gets its own concrete implementation — none of this leaks into Pulse's core.

---

## 9. SMART in CapabilityStatement

The CapabilityStatement must advertise SMART support. All endpoint URLs come from settings:

```python
# app/routers/metadata.py (security section)

SMART_SECURITY = {
    "cors": True,
    "service": [{
        "coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/restful-security-service",
            "code": "SMART-on-FHIR",
            "display": "SMART on FHIR",
        }]
    }],
    "description": "OAuth2 via SMART App Launch v2",
    "extension": [{
        "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
        "extension": [
            {"url": "authorize",  "valueUri": settings.IAM_AUTH_ENDPOINT},
            {"url": "token",      "valueUri": settings.IAM_TOKEN_ENDPOINT},
            {"url": "introspect", "valueUri": settings.IAM_INTROSPECT_ENDPOINT},
            {"url": "revoke",     "valueUri": settings.IAM_REVOKE_ENDPOINT},
            {"url": "register",   "valueUri": f"{settings.PULSE_BASE_URL}/smart/register"},
        ],
    }],
}
```

---

## 10. Inferno SMART Test Preparation

### Test Group: SMART App Launch v2

| Test | What It Checks | Common Failure |
|---|---|---|
| Discovery | `/.well-known/smart-configuration` valid JSON with required fields | Missing `code_challenge_methods_supported` or `capabilities` array |
| Authorization request | Auth endpoint accepts PKCE parameters | `code_challenge_method` not echoed back in response |
| Token exchange | `POST /token` with code + `code_verifier` returns valid access token | IAM not validating `code_verifier` (check PKCE is enabled on the client) |
| Token contains patient context | `patient` claim present in token response body | Launch context not injected into claims (see §3.1.1) |
| Scope filtering | Token only grants requested scopes | IAM granting all scopes by default — configure scope consent |
| Refresh token | `offline_access` scope allows token refresh | `offline_access` scope not available on the client |
| Token revocation | `POST /revoke` invalidates token | Revocation endpoint not advertised in `.well-known` |

### Pre-Inferno Verification Checklist

```bash
# Verify .well-known returns valid JSON
curl -s https://yourplatform.com/.well-known/smart-configuration | jq .

# Verify metadata has SMART security extensions
curl -s -H "Accept: application/fhir+json" \
  https://yourplatform.com/api/fhir/v1/metadata | jq '.rest[0].security'

# Manual PKCE flow test (replace with your IAM's auth endpoint)
VERIFIER=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-43)
CHALLENGE=$(echo -n "$VERIFIER" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')

# Construct the auth URL
echo "https://your-iam.example.com/authorize?client_id=inferno-test&response_type=code&scope=openid+patient/Patient.rs&code_challenge=${CHALLENGE}&code_challenge_method=S256&redirect_uri=http://localhost:4567/callback"

# After redirect, exchange code for token:
curl -X POST https://your-iam.example.com/token \
  -d "grant_type=authorization_code&code=XXXX&code_verifier=${VERIFIER}&client_id=inferno-test&redirect_uri=http://localhost:4567/callback"
```

### Inferno Quick Start

```bash
docker pull healthlake/inferno:latest
docker run -p 4567:4567 healthlake/inferno:latest
# Open http://localhost:4567
# Set FHIR Server URL: https://yourplatform.com/api/fhir/v1
# Run "SMART App Launch" test group first — fix all failures before moving to US Core
```

---

## 11. Settings Reference

```python
# app/core/config.py (and pulse/core/config.py — shared pattern)
class Settings(BaseSettings):
    # ... existing fields ...

    # IAM — works with any OAuth2/OIDC-compliant provider
    IAM_ISSUER: str               # token issuer URL — must match `iss` claim in JWTs
    IAM_JWKS_URL: str             # URL to fetch public keys for JWT verification
    IAM_AUDIENCE: str = "fhir-server"  # expected `aud` claim in JWTs
    IAM_TOKEN_ENDPOINT: str       # POST here to exchange codes / refresh tokens
    IAM_AUTH_ENDPOINT: str        # redirect users here for authorization code flow
    IAM_REVOKE_ENDPOINT: str      # POST here to revoke tokens
    IAM_INTROSPECT_ENDPOINT: str  # POST here to check token active status
    IAM_REGISTRATION_ENDPOINT: str   # dynamic client registration (RFC 7591)
    IAM_CLIENT_ID: str            # this service's client ID (for introspect/revoke)
    IAM_CLIENT_SECRET: str        # store in Secrets Manager, never in .env
    IAM_ROLES_CLAIM: str = "roles"  # JWT claim name that carries role list

    # Pulse backend service identity (RFC 7523)
    PULSE_CLIENT_ID: str          # client_credentials client ID for Pulse → FHIR calls
    PULSE_PRIVATE_KEY_PATH: str   # RSA private key path for JWT client assertion

    # Service URLs
    FHIR_BASE_URL: str            # public FHIR server base URL
    PULSE_BASE_URL: str           # Pulse service public base URL

    # Session
    SESSION_TTL_SECONDS: int = 900
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
```
