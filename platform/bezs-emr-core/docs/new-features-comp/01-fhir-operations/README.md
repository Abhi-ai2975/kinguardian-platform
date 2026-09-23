# FHIR Operations

FHIR R4 defines *operations* — named procedures invoked with `$` syntax — as first-class citizens  
of the spec. Medplum implements 50+ operations. We implement zero.

---

## Operations Overview

| File | Operations Covered |
|---|---|
| [01-validate.md](./01-validate.md) | `$validate` — resource conformance validation |
| [02-terminology-operations.md](./02-terminology-operations.md) | `$expand`, `$lookup`, `$validate-code`, `$translate`, `$subsumes` |
| [03-patient-operations.md](./03-patient-operations.md) | `$everything`, `$match`, `$summary`, `$merge` |
| [04-bulk-data.md](./04-bulk-data.md) | `$export`, `$import`, async job management |
| [05-ai-operations.md](./05-ai-operations.md) | `$ai` — streaming AI model proxy |
| [06-admin-operations.md](./06-admin-operations.md) | `$expunge`, `$db-stats`, `$async-job-cancel`, resource re-indexing |

---

## How FHIR Operations Work

Operations are invoked via HTTP POST to `[base]/[Resource]/$[name]` or `[base]/$[name]`.  
They accept a `Parameters` resource body and return either a `Parameters` resource or another  
FHIR resource type.

```
POST /Patient/10001/$everything
POST /ValueSet/$expand
POST /$validate
```

Operations can be:
- **Instance-level**: act on a specific resource (`/Patient/10001/$everything`)
- **Type-level**: act on a resource type (`/Patient/$match`)
- **System-level**: act on the whole server (`/$export`)

---

## Implementation Approach

We'll add a **router per operation** mounted at `app/routers/operations/`.  
Each operation is a thin FastAPI endpoint that delegates to an `OperationService`.

```
app/
└── routers/
    └── operations/
        ├── __init__.py         # mounts all operation routers
        ├── validate.py
        ├── terminology.py
        ├── patient.py
        ├── bulk_export.py
        ├── ai_proxy.py
        └── admin.py
```

All operations must:
1. Accept `Parameters` resource body (or typed Pydantic schema)
2. Return proper FHIR response (including `OperationOutcome` on error)
3. Appear in `/openapi.json` for MCP consumers
4. Require appropriate permission (`require_permission("Resource", "read")`)
