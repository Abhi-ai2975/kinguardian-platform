# Multi-Tenancy — Project Isolation

---

## Current State

We have basic multi-tenancy via `org_id` scoping on every resource.  
All tenants share the same database schema and tables.

**What's missing:**
- Resource quotas per organization
- Per-org feature flags
- Organization-level configuration (AI quotas, custom branding)
- Super-admin management API
- Organization onboarding flow
- Tenant isolation at network level (for enterprise customers requiring strict separation)

---

## Tenancy Models

### Model A: Shared Schema (Current — Row-Level Security)
- All orgs in same tables, separated by `org_id` column
- Pros: simple, low overhead
- Cons: noisy neighbor, accidental cross-tenant data leaks if bug

### Model B: Schema-per-tenant
- Each org has its own PostgreSQL schema (`org_abc.patients`, `org_xyz.patients`)
- Pros: strong isolation, easy per-tenant backup/restore
- Cons: schema migrations harder, connection pooling overhead

### Model C: Database-per-tenant (Enterprise)
- Each enterprise org gets its own PostgreSQL database/RDS instance
- Pros: complete isolation, HIPAA-friendly for large orgs
- Cons: expensive, hard to manage at scale

**Recommendation:** Implement Model A + PostgreSQL Row Security Policies (RLS)  
for automatic enforcement. Add Model C support for enterprise customers.

---

## PostgreSQL Row Security Policies

```sql
-- Enable RLS on all resource tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their org's data
CREATE POLICY patient_org_isolation ON patients
    USING (org_id = current_setting('app.current_org_id'));

-- Apply to all tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('CREATE POLICY %I_org_isolation ON %I USING (org_id = current_setting(''app.current_org_id''))', tbl, tbl);
    END LOOP;
END $$;
```

Set the org context in the connection:

```python
# In session factory, set org context on every connection
async with session_factory() as session:
    await session.execute(text("SET LOCAL app.current_org_id = :org_id"), {"org_id": org_id})
    # All subsequent queries in this session are automatically scoped
    result = await session.execute(select(Patient))  # only org's patients
```

---

## Organization Resource

```sql
CREATE TABLE organizations_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL UNIQUE,           -- matches JWT activeOrganizationId
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter',  -- starter, professional, enterprise
    status TEXT NOT NULL DEFAULT 'active',
    features JSONB NOT NULL DEFAULT '{}',  -- feature flags
    limits JSONB NOT NULL DEFAULT '{}',    -- quotas
    settings JSONB NOT NULL DEFAULT '{}',  -- org-level config
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Plan Limits

```python
PLAN_LIMITS = {
    "starter": {
        "max_patients": 1000,
        "max_users": 5,
        "ai_tokens_per_month": 100_000,
        "bulk_export_enabled": False,
        "hl7_enabled": False,
        "api_rate_limit_rpm": 100,
    },
    "professional": {
        "max_patients": 10_000,
        "max_users": 50,
        "ai_tokens_per_month": 1_000_000,
        "bulk_export_enabled": True,
        "hl7_enabled": True,
        "api_rate_limit_rpm": 1000,
    },
    "enterprise": {
        "max_patients": None,   # unlimited
        "max_users": None,
        "ai_tokens_per_month": None,
        "bulk_export_enabled": True,
        "hl7_enabled": True,
        "dicom_enabled": True,
        "api_rate_limit_rpm": 10_000,
        "dedicated_db": True,
        "custom_domain": True,
    },
}
```

---

## Organization Admin API

```
GET    /admin/organizations                    — List all orgs (superadmin only)
POST   /admin/organizations                    — Onboard new org
GET    /admin/organizations/{org_id}           — Get org details
PUT    /admin/organizations/{org_id}           — Update org config
DELETE /admin/organizations/{org_id}           — Deactivate org
GET    /admin/organizations/{org_id}/stats     — Usage stats
POST   /admin/organizations/{org_id}/$upgrade  — Change plan
POST   /admin/organizations/{org_id}/$export   — Export all org data (GDPR)
POST   /admin/organizations/{org_id}/$purge    — Delete all org data (GDPR right to erasure)
```

---

## Feature Flags

```python
# app/core/feature_flags.py

class FeatureFlags:
    def __init__(self, org_config: dict):
        self.flags = org_config.get("features", {})
        self.plan = org_config.get("plan", "starter")

    def is_enabled(self, feature: str) -> bool:
        # Explicit flag overrides plan
        if feature in self.flags:
            return bool(self.flags[feature])
        # Check plan limits
        return PLAN_LIMITS.get(self.plan, {}).get(f"{feature}_enabled", False)

# In router:
@router.post("/$export")
async def bulk_export(request: Request, ...):
    flags = FeatureFlags(org_config)
    if not flags.is_enabled("bulk_export"):
        raise HTTPException(403, "Bulk export not available on your plan")
    ...
```
