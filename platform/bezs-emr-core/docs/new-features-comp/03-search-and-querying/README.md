# Search & Querying

Our current search is limited to `family_name`, `given_name`, and a few hard-coded filters per resource.  
FHIR R4 defines a rich search framework. Medplum also adds FHIRPath and GraphQL on top.

---

## Current State

```
GET /Patient?family=Smith&given=John     ← works (custom filter)
GET /Encounter?patient=10001            ← does NOT work
GET /Observation?code=8867-4            ← does NOT work
GET /Patient?_include=Patient:managingOrganization  ← does NOT work
GET /Patient?_sort=birthDate            ← does NOT work
```

---

## Files in This Section

| File | Topic |
|---|---|
| [01-search-parameters.md](./01-search-parameters.md) | FHIR R4 search parameters: token, reference, date, string, quantity, composite |
| [02-fhirpath.md](./02-fhirpath.md) | FHIRPath — expression language for FHIR data querying |
| [03-graphql.md](./03-graphql.md) | GraphQL API over FHIR data |
| [04-sql-on-fhir.md](./04-sql-on-fhir.md) | SQL-on-FHIR — flat views for analytics |

---

## FHIR Search Framework Overview

FHIR search works via query string parameters on resource list endpoints:

```
GET /[resource]?[searchParam]=[value]&[modifier]=[value]
```

### Search Parameter Types

| Type | Example | Description |
|---|---|---|
| `string` | `?family=Smith` | Case-insensitive string match |
| `token` | `?status=active` | Code / system\|code match |
| `reference` | `?patient=Patient/10001` | Resource reference |
| `date` | `?birthDate=ge1980-01-01` | Date/range comparison |
| `quantity` | `?value-quantity=lt100\|mg` | Numeric with units |
| `uri` | `?system=http://loinc.org` | URI match |
| `composite` | `?code-value-quantity=8867-4$lt100` | Combined params |

### Standard Search Parameters (all resources)

| Param | Type | Meaning |
|---|---|---|
| `_id` | token | Filter by resource ID |
| `_lastUpdated` | date | Filter by update time |
| `_sort` | special | Sort results |
| `_count` | special | Page size |
| `_offset` | special | Page start |
| `_include` | special | Include referenced resources |
| `_revinclude` | special | Include resources that reference this one |
| `_summary` | special | Return summary fields only |
| `_elements` | special | Return specific fields only |
| `_total` | special | Control total count behavior |
| `_filter` | special | Complex filter expressions |
