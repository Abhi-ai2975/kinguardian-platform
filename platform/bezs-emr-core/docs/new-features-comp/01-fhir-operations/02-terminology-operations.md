# Terminology Operations — $expand, $lookup, $validate-code, $translate, $subsumes

**FHIR Spec:** https://www.hl7.org/fhir/R4/terminology-service.html  
**Medplum reference:** `packages/server/src/fhir/operations/codesystemlookup.ts`, `valuesetsexpand.ts`

---

## Why Terminology Matters

Clinical data is only interoperable when codes mean the same thing across systems.  
FHIR Terminology Services are the standard mechanism for:
- Expanding a ValueSet to get all valid codes for a field
- Looking up the meaning of a code
- Validating that a code is in a particular ValueSet
- Translating codes between coding systems (e.g., SNOMED → ICD-10)

Without these operations, every client must embed a local copy of SNOMED, LOINC, RxNorm, etc.

---

## Operations

### `ValueSet/$expand`

Expands a ValueSet to return all member codes. Required for autocomplete dropdowns in UIs.

```
POST /ValueSet/$expand
GET  /ValueSet/$expand?url=http://hl7.org/fhir/ValueSet/condition-clinical&filter=dia
```

**Request body (POST):**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "url", "valueUri": "http://hl7.org/fhir/ValueSet/condition-clinical" },
    { "name": "filter", "valueString": "dia" },
    { "name": "count", "valueInteger": 20 },
    { "name": "offset", "valueInteger": 0 }
  ]
}
```

**Response:**
```json
{
  "resourceType": "ValueSet",
  "expansion": {
    "total": 3,
    "offset": 0,
    "contains": [
      { "system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active", "display": "Active" },
      { "system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "inactive", "display": "Inactive" }
    ]
  }
}
```

### `CodeSystem/$lookup`

Looks up the display name, definition, and properties of a single code.

```
GET /CodeSystem/$lookup?system=http://loinc.org&code=8867-4
```

**Response:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "name", "valueString": "Heart rate" },
    { "name": "display", "valueString": "Heart rate" },
    { "name": "definition", "valueString": "Number of heartbeats per minute" }
  ]
}
```

### `ValueSet/$validate-code`

Checks whether a given code is valid in a ValueSet.

```
POST /ValueSet/$validate-code
```

**Response:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "result", "valueBoolean": true },
    { "name": "display", "valueString": "Active" }
  ]
}
```

### `ConceptMap/$translate`

Maps a code from one system to another using a stored ConceptMap.

```
POST /ConceptMap/$translate
```

**Request:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "url", "valueUri": "http://example.org/ConceptMap/icd9-to-icd10" },
    { "name": "system", "valueUri": "http://hl7.org/fhir/sid/icd-9-cm" },
    { "name": "code", "valueCode": "250.00" }
  ]
}
```

**Response:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "result", "valueBoolean": true },
    {
      "name": "match",
      "part": [
        { "name": "equivalence", "valueCode": "equivalent" },
        { "name": "concept", "valueCoding": { "system": "http://hl7.org/fhir/sid/icd-10", "code": "E11.9" } }
      ]
    }
  ]
}
```

### `CodeSystem/$subsumes`

Checks whether one code subsumes another (IS-A relationship in hierarchical code systems like SNOMED).

```
POST /CodeSystem/$subsumes
```

---

## Current State

We have a `terminology` service with semantic/vector search but no FHIR-standard operations.  
The existing search is non-standard and returns plain JSON, not FHIR `ValueSet` or `Parameters`.

---

## Implementation Plan

### Step 1 — Seed CodeSystem and ValueSet resources

We need FHIR R4 CodeSystem and ValueSet resources stored in our database.  
Download from official FHIR packages:

```bash
# FHIR R4 terminology packages
npm pack hl7.fhir.r4.core
# Extract CodeSystem/*.json and ValueSet/*.json
# Bulk-insert via a seed migration
```

Key code systems to seed:
- SNOMED CT (http://snomed.info/sct)
- LOINC (http://loinc.org)
- RxNorm (http://www.nlm.nih.gov/research/umls/rxnorm)
- ICD-10-CM (http://hl7.org/fhir/sid/icd-10-cm)
- CPT (http://www.ama-assn.org/go/cpt)
- All FHIR internal code systems

### Step 2 — Database Schema

```sql
-- Store full CodeSystem resources as JSONB
CREATE TABLE code_systems (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    version TEXT,
    name TEXT,
    content TEXT,  -- 'complete', 'fragment', 'not-present', 'example', 'supplement'
    resource JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store full ValueSet resources as JSONB
CREATE TABLE value_sets (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    version TEXT,
    name TEXT,
    resource JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expanded concept cache for fast lookups
CREATE TABLE concepts (
    id SERIAL PRIMARY KEY,
    system_url TEXT NOT NULL,
    code TEXT NOT NULL,
    display TEXT,
    definition TEXT,
    properties JSONB,
    UNIQUE(system_url, code)
);
CREATE INDEX idx_concepts_system_code ON concepts(system_url, code);
CREATE INDEX idx_concepts_display ON concepts USING GIN(to_tsvector('english', display));
```

### Step 3 — Terminology Service

```python
# app/services/terminology_service.py

class TerminologyService:
    async def expand_value_set(
        self,
        url: str,
        filter: str | None = None,
        count: int = 20,
        offset: int = 0,
    ) -> dict:
        """Expand a ValueSet URL to its member concepts."""
        ...

    async def lookup_code(self, system: str, code: str) -> dict:
        """Look up a concept in a CodeSystem."""
        ...

    async def validate_code(self, url: str, system: str, code: str) -> dict:
        """Check if a code is in a ValueSet."""
        ...

    async def translate(self, concept_map_url: str, system: str, code: str) -> dict:
        """Translate a code using a ConceptMap."""
        ...

    async def subsumes(self, system: str, code_a: str, code_b: str) -> dict:
        """Check IS-A subsumption between two codes."""
        ...
```

### Step 4 — Routers

```python
# app/routers/operations/terminology.py

@router.post("/ValueSet/$expand", operation_id="valueset_expand")
async def expand(body: TerminologyParameters, svc=Depends(get_terminology_svc)):
    url = get_param(body, "url")
    filter_str = get_param(body, "filter")
    return await svc.expand_value_set(url, filter_str)

@router.get("/CodeSystem/$lookup", operation_id="codesystem_lookup")
async def lookup(system: str, code: str, svc=Depends(get_terminology_svc)):
    return await svc.lookup_code(system, code)
```

---

## Integration with Existing Terminology

Our existing `terminology` table with vector embeddings can serve as the **semantic expansion** layer:
- Standard `$expand` queries the `concepts` table (exact/prefix match)
- Semantic search queries the `terminology` embedding table (vector similarity)
- Both surfaces are exposed but through different endpoints

---

## Testing Strategy

```python
async def test_expand_loinc_heart_rate():
    resp = await client.get("/CodeSystem/$lookup?system=http://loinc.org&code=8867-4")
    assert resp.json()["parameter"][0]["valueString"] == "Heart rate"

async def test_validate_invalid_code():
    resp = await client.post("/ValueSet/$validate-code", json={...})
    result = next(p for p in resp.json()["parameter"] if p["name"] == "result")
    assert result["valueBoolean"] is False
```
