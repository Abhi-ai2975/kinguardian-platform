# SCIM 2.0 — System for Cross-domain Identity Management

**Spec:** https://datatracker.ietf.org/doc/html/rfc7644  
**Medplum reference:** `packages/server/src/scim/`

---

## What Is SCIM?

SCIM is a REST API protocol for managing user identities across systems. Enterprises use it to:
- Automatically provision users from Active Directory / Okta / Azure AD to our FHIR server
- Automatically deprovision users when they leave (no orphaned accounts)
- Synchronize user attributes (name, department, role)
- Sync groups (FHIR-side roles/teams)

Without SCIM, healthcare organizations with 500+ users must manually create accounts,  
assign roles, and deactivate leavers — a massive operational burden and security risk.

---

## SCIM Endpoints

```
GET    /scim/v2/Users              — List users
POST   /scim/v2/Users              — Create user
GET    /scim/v2/Users/{id}         — Get user
PUT    /scim/v2/Users/{id}         — Replace user
PATCH  /scim/v2/Users/{id}         — Update user attributes
DELETE /scim/v2/Users/{id}         — Delete (deactivate) user

GET    /scim/v2/Groups             — List groups
POST   /scim/v2/Groups             — Create group
GET    /scim/v2/Groups/{id}        — Get group
PUT    /scim/v2/Groups/{id}        — Replace group
PATCH  /scim/v2/Groups/{id}        — Update group members
DELETE /scim/v2/Groups/{id}        — Delete group

GET    /scim/v2/ServiceProviderConfig   — SCIM server capabilities
GET    /scim/v2/Schemas                 — SCIM schema definitions
GET    /scim/v2/ResourceTypes           — Available resource types
```

---

## SCIM User Representation

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "user-uuid",
  "externalId": "okta-user-id-xyz",
  "userName": "jsmith@example.com",
  "name": { "givenName": "John", "familyName": "Smith" },
  "displayName": "John Smith",
  "emails": [{ "value": "jsmith@example.com", "primary": true }],
  "phoneNumbers": [{ "value": "+1-555-1234" }],
  "active": true,
  "groups": [{ "value": "practitioners", "display": "Practitioners" }],
  "meta": {
    "resourceType": "User",
    "created": "2024-01-01T00:00:00Z",
    "lastModified": "2024-06-01T12:00:00Z"
  }
}
```

---

## SCIM Group Representation

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
  "id": "group-uuid",
  "displayName": "Practitioners",
  "members": [
    { "value": "user-uuid-1", "display": "John Smith" },
    { "value": "user-uuid-2", "display": "Jane Doe" }
  ]
}
```

---

## FHIR Mapping

When a user is provisioned via SCIM, we automatically create a corresponding FHIR resource:

| SCIM User | FHIR Resource |
|---|---|
| Clinical staff | `Practitioner` |
| Admin/billing | No FHIR resource (internal user only) |
| Patient | `Patient` (if patient portal) |

When a group is provisioned:

| SCIM Group | FHIR + Access |
|---|---|
| `practitioners` | Assign `system-practitioner` AccessPolicy |
| `nurses` | Assign `system-nurse` AccessPolicy |
| `billing` | Assign `system-billing` AccessPolicy |
| `admins` | Assign `system-superadmin` AccessPolicy |

---

## Implementation Plan

### Step 1 — User Table

```sql
-- SCIM users (maps to our JWT sub + profile)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,          -- Okta/Azure AD ID
    username TEXT NOT NULL UNIQUE,    -- email or username
    email TEXT NOT NULL UNIQUE,
    given_name TEXT,
    family_name TEXT,
    active BOOLEAN DEFAULT TRUE,
    org_id TEXT NOT NULL,
    fhir_resource_type TEXT,          -- 'Practitioner', 'Patient', NULL
    fhir_resource_id INTEGER,         -- the public FHIR ID if linked
    password_hash TEXT,               -- if using local login
    mfa_secret TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_groups (
    user_id UUID NOT NULL REFERENCES users(id),
    group_id UUID NOT NULL REFERENCES groups(id),
    PRIMARY KEY (user_id, group_id)
);

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    org_id TEXT NOT NULL,
    access_policy_id INTEGER REFERENCES access_policies(id),
    external_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 2 — SCIM Service

```python
# app/services/scim_service.py

class SCIMService:
    async def provision_user(self, scim_user: SCIMUser, org_id: str) -> User:
        """Create or update a user from a SCIM provisioning event."""
        existing = await self.user_repo.get_by_external_id(scim_user.external_id)
        if existing:
            return await self.user_repo.update(existing.id, scim_user)
        user = await self.user_repo.create(scim_user, org_id)
        if self._is_clinical_user(scim_user):
            await self._create_practitioner(user, org_id)
        return user

    async def deprovision_user(self, user_id: str) -> None:
        """Disable user and revoke all tokens."""
        await self.user_repo.deactivate(user_id)
        await self.token_repo.revoke_all_for_user(user_id)

    async def sync_group(self, scim_group: SCIMGroup, org_id: str) -> Group:
        """Sync group membership and map to AccessPolicy."""
        group = await self.group_repo.upsert(scim_group, org_id)
        for member in scim_group.members:
            await self.user_group_repo.upsert(member.value, group.id)
        return group
```

### Step 3 — SCIM Router

```python
# app/routers/scim.py

scim_router = APIRouter(prefix="/scim/v2", tags=["SCIM"])

@scim_router.get("/Users", operation_id="scim_list_users")
async def list_users(startIndex: int = 1, count: int = 100, filter: str | None = None, svc=Depends(get_scim_svc)):
    users = await svc.list_users(startIndex, count, filter)
    return scim_list_response("User", users, startIndex)

@scim_router.post("/Users", status_code=201, operation_id="scim_create_user")
async def create_user(body: SCIMUser, request: Request, svc=Depends(get_scim_svc)):
    user = await svc.provision_user(body, request.state.user.get("activeOrganizationId"))
    return scim_user_response(user)

@scim_router.delete("/Users/{user_id}", status_code=204, operation_id="scim_delete_user")
async def delete_user(user_id: str, svc=Depends(get_scim_svc)):
    await svc.deprovision_user(user_id)
```

---

## Service Provider Configuration

```python
@scim_router.get("/ServiceProviderConfig")
async def service_provider_config():
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
        "patch": { "supported": True },
        "bulk": { "supported": False },
        "filter": { "supported": True, "maxResults": 200 },
        "changePassword": { "supported": True },
        "sort": { "supported": True },
        "etag": { "supported": True },
        "authenticationSchemes": [{
            "type": "oauthbearertoken",
            "name": "OAuth Bearer Token",
            "description": "Authentication scheme using OAuth Bearer Token"
        }]
    }
```

---

## Supported IdP Integrations

| IdP | SCIM Version | Notes |
|---|---|---|
| Okta | SCIM 2.0 | Native connector available |
| Azure Active Directory | SCIM 2.0 | Enterprise App Gallery |
| Google Workspace | SCIM 2.0 | via Google Cloud Directory Sync |
| OneLogin | SCIM 2.0 | Native connector available |
| Auth0 | SCIM 2.0 | Requires enterprise plan |
