# Authentication & Authorization

This is the most critical gap. Without proper auth infrastructure, the FHIR server cannot be  
integrated with EHRs, patient portals, or any third-party application that uses SMART on FHIR.

---

## Current State

We validate JWTs signed by an external IAM (JWKS endpoint), extracting `sub` and `activeOrganizationId`.  
We have no:
- OAuth2 authorization server
- SMART on FHIR app launch framework  
- Fine-grained role/resource-level access control
- SCIM for external identity synchronization

---

## Files in This Section

| File | Topic |
|---|---|
| [01-oauth2.md](./01-oauth2.md) | OAuth2 authorization server — authorization_code, client_credentials, refresh_token flows |
| [02-smart-on-fhir.md](./02-smart-on-fhir.md) | SMART App Launch Framework — EHR launch, standalone launch, patient context |
| [03-access-policy.md](./03-access-policy.md) | Fine-grained FHIR AccessPolicy — resource-level RBAC and compartment scoping |
| [04-scim.md](./04-scim.md) | SCIM 2.0 — external identity sync for enterprise SSO |

---

## Architecture Decision

**Option A: Embed OAuth2 server in our FastAPI app**
- Pro: single service, full control, no extra infrastructure
- Con: significant implementation effort, security-critical code

**Option B: Delegate to a dedicated auth server (Keycloak, Auth0, AWS Cognito)**
- Pro: battle-tested, standards-compliant, faster to implement
- Con: extra infrastructure, SMART on FHIR requires custom integration

**Recommendation:** Use Keycloak or Auth0 as the OAuth2/OIDC provider, add SMART launch protocol  
handling in our FastAPI app, and implement AccessPolicy as our own layer.  
This is how most production FHIR servers work.

---

## Quick Reference — SMART Endpoints

A FHIR server that supports SMART must expose a discovery document:

```
GET /.well-known/smart-configuration
{
  "authorization_endpoint": "https://auth.example.com/oauth2/authorize",
  "token_endpoint": "https://auth.example.com/oauth2/token",
  "capabilities": ["launch-ehr", "launch-standalone", "client-public", "client-confidential-symmetric", "sso-openid-connect", "context-banner", "context-style", "context-ehr-patient", "context-ehr-encounter", "permission-patient", "permission-user", "permission-offline"],
  "scopes_supported": ["openid", "profile", "fhirUser", "patient/*.read", "user/*.read", "system/*.read", "offline_access"]
}
```
