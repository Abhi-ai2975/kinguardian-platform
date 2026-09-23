# SMART on FHIR — App Launch Framework

**FHIR Spec:** https://www.hl7.org/fhir/R4/smart-app-launch/  
**SMART IG:** https://hl7.org/fhir/smart-app-launch/  
**Medplum reference:** `packages/server/src/auth/smart.ts`

---

## What Is SMART on FHIR?

SMART (Substitutable Medical Applications, Reusable Technologies) on FHIR is the standard  
for launching healthcare apps in the context of an EHR session.  

When a clinician is viewing Patient John Smith in the EHR and clicks "Launch App",  
the app receives:
- The OAuth2 access token (already authorized, no re-login)
- Patient context: `patient: "Patient/10001"`
- Encounter context: `encounter: "Encounter/20001"`
- Practitioner context: `fhirUser: "Practitioner/30001"`

Without SMART, every app would need its own login — clinicians would need to re-authenticate  
in every integrated app, which is completely impractical in a clinical setting.

---

## SMART Launch Types

### EHR Launch (most common)

The EHR launches the app with a short-lived `launch` token.

```
1. EHR sends user to:
   GET https://app.example.com/launch
       ?iss=https://fhir.example.com
       &launch=abc123

2. App reads discovery document:
   GET https://fhir.example.com/.well-known/smart-configuration

3. App redirects to authorization:
   GET https://fhir.example.com/oauth2/authorize
       ?response_type=code
       &client_id=my-app
       &redirect_uri=https://app.example.com/callback
       &scope=launch openid fhirUser patient/Patient.read
       &state=xyz789
       &launch=abc123
       &code_challenge=...

4. Authorization server validates launch token, returns code

5. App exchanges code for token:
   POST https://fhir.example.com/oauth2/token
       grant_type=authorization_code&code=...

6. Token response includes:
   {
     "access_token": "...",
     "token_type": "Bearer",
     "scope": "launch openid fhirUser patient/Patient.read",
     "patient": "Patient/10001",
     "encounter": "Encounter/20001",
     "fhirUser": "Practitioner/30001"
   }
```

### Standalone Launch

App launches independently (not from EHR). User picks their patient after login.

```
1. User visits app.example.com directly
2. App redirects to authorization (no launch token)
3. User authenticates
4. App may request patient selection: scope includes "launch/patient"
5. Server shows patient picker, user selects John Smith
6. Token response includes patient: "Patient/10001"
```

---

## SMART Discovery Document

Every SMART-capable FHIR server must expose:

```
GET /.well-known/smart-configuration
```

**Response:**
```json
{
  "issuer": "https://fhir.example.com",
  "jwks_uri": "https://fhir.example.com/.well-known/jwks.json",
  "authorization_endpoint": "https://fhir.example.com/oauth2/authorize",
  "grant_types_supported": ["authorization_code", "client_credentials"],
  "token_endpoint": "https://fhir.example.com/oauth2/token",
  "token_endpoint_auth_methods_supported": ["private_key_jwt", "client_secret_basic"],
  "registration_endpoint": "https://fhir.example.com/oauth2/register",
  "scopes_supported": [
    "openid", "profile", "fhirUser", "offline_access",
    "launch", "launch/patient", "launch/encounter",
    "patient/*.read", "patient/*.write",
    "user/*.read", "user/*.write",
    "system/*.read", "system/*.write"
  ],
  "response_types_supported": ["code"],
  "capabilities": [
    "launch-ehr",
    "launch-standalone",
    "client-public",
    "client-confidential-symmetric",
    "client-confidential-asymmetric",
    "sso-openid-connect",
    "context-banner",
    "context-style",
    "context-ehr-patient",
    "context-ehr-encounter",
    "permission-patient",
    "permission-user",
    "permission-offline",
    "permission-v2"
  ],
  "code_challenge_methods_supported": ["S256"]
}
```

---

## SMART Scopes

SMART scopes follow the pattern `[context]/[ResourceType].[permission]`:

| Scope | Meaning |
|---|---|
| `patient/Patient.read` | Read Patient resources for the launched patient only |
| `patient/*.read` | Read all FHIR resources for the launched patient |
| `user/Practitioner.read` | Read Practitioner resources the user can access |
| `user/*.write` | Write any resource the user has permission to |
| `system/*.read` | Backend service: read all resources |
| `launch` | Request EHR context (patient, encounter) |
| `launch/patient` | Standalone: prompt for patient selection |
| `launch/encounter` | Include encounter in context |
| `openid` | Request OIDC ID token |
| `fhirUser` | Include `fhirUser` claim (reference to Practitioner/Patient) |
| `offline_access` | Request refresh token |

---

## Launch Token Table

```sql
CREATE TABLE smart_launch_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    client_id TEXT NOT NULL,
    patient_id TEXT,           -- Patient context to inject
    encounter_id TEXT,         -- Encounter context to inject
    practitioner_id TEXT,      -- Practitioner context
    org_id TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'launch',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Creating a Launch Token (from our EMR)

```python
# When clinician opens an integrated app from our EMR:
@router.post("/smart/launch", operation_id="create_smart_launch_token")
async def create_launch(body: SmartLaunchRequest, request: Request, svc=Depends(get_smart_svc)):
    token = await svc.create_launch_token(
        client_id=body.client_id,
        patient_id=body.patient_id,
        encounter_id=body.encounter_id,
        org_id=request.state.user.get("activeOrganizationId"),
    )
    return {"launch": token, "iss": settings.FHIR_BASE_URL}
```

---

## EHR Launch Handler

```python
# app/auth/smart.py

class SMARTService:
    async def validate_launch_token(self, launch: str, client_id: str) -> SmartContext:
        """Validate the launch token and return patient/encounter context."""
        token = await self.db.get_launch_token(launch)
        if not token or token.client_id != client_id:
            raise InvalidLaunchError("Invalid or expired launch token")
        if token.expires_at < datetime.utcnow():
            raise InvalidLaunchError("Launch token expired")
        if token.used_at:
            raise InvalidLaunchError("Launch token already used (one-time)")
        await self.db.mark_launch_used(launch)
        return SmartContext(
            patient=token.patient_id,
            encounter=token.encounter_id,
            practitioner=token.practitioner_id,
        )

    async def handle_authorization(
        self,
        client_id: str,
        scope: str,
        launch: str | None,
        user: dict,
    ) -> dict:
        """Build the authorization response including SMART context."""
        context = await self.validate_launch_token(launch, client_id) if launch else SmartContext()
        code = await self.create_auth_code(client_id, scope, user, context)
        return {"code": code, "state": ...}
```

---

## Context Banner & Styling

SMART apps that request `context-banner` and `context-style` get visual context injected:

```
GET /smart/context-banner?patient=10001
→ { "patient": "John Smith", "dob": "1985-03-15", "gender": "male", "mrn": "MRN-10001" }

GET /smart/context-style
→ { "color_background": "#1A6FA8", "color_highlight": "#FFFFFF", "color_alternate": "#003060" }
```

---

## FHIR `CapabilityStatement` — Advertising SMART Support

Our `GET /metadata` endpoint must advertise SMART capabilities:

```json
{
  "resourceType": "CapabilityStatement",
  "rest": [{
    "security": {
      "extension": [{
        "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
        "extension": [
          { "url": "authorize", "valueUri": "https://fhir.example.com/oauth2/authorize" },
          { "url": "token", "valueUri": "https://fhir.example.com/oauth2/token" }
        ]
      }],
      "service": [{
        "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/restful-security-service", "code": "SMART-on-FHIR" }]
      }]
    }
  }]
}
```
