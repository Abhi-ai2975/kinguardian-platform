# FHIR Search Parameters

**FHIR Spec:** https://www.hl7.org/fhir/R4/search.html  
**Medplum reference:** `packages/server/src/fhir/search.ts`, `searchparameter.ts`

---

## Architecture: How to Implement FHIR Search

There are two schools of thought:

### Approach A: Store resources as JSONB (Medplum's approach)

Store the full FHIR resource JSON in a `resource JSONB` column.  
Build a separate `lookup` table with extracted search parameter values.  
All queries go through the lookup table.

**Pros:** Flexible, add new search params without migrations, exact FHIR representation  
**Cons:** Complex query engine, harder to add business logic per field

### Approach B: Column-per-field (our current approach)

Each FHIR field gets a typed PostgreSQL column.  
Search maps to `WHERE` clauses on those columns.

**Pros:** Simple queries, easy to add business logic, typed data  
**Cons:** Must add new columns for each search param, schema migrations required

**Recommendation:** Keep Approach B (our current columns) but build a proper search parameter  
framework on top, mapping FHIR search parameter names to our column names.

---

## Search Parameter Registry

Create a registry that maps FHIR search parameter names to SQL columns:

```python
# app/core/search_registry.py

PATIENT_SEARCH_PARAMS = {
    "_id":          SearchParam("patient_id", "token", "patients.patient_id"),
    "_lastUpdated": SearchParam("updated_at", "date",  "patients.updated_at"),
    "family":       SearchParam("family_name", "string", "patients.family_name"),
    "given":        SearchParam("given_name",  "string", "patients.given_name"),
    "name":         SearchParam(None, "string", None, composite=["family_name", "given_name"]),
    "birthdate":    SearchParam("birth_date", "date",   "patients.birth_date"),
    "gender":       SearchParam("gender",     "token",  "patients.gender"),
    "identifier":   SearchParam(None, "token", None, json_path="patients.identifiers"),
    "active":       SearchParam("active",     "token",  "patients.active"),
    "email":        SearchParam(None, "token", None, json_path="patients.telecoms", filter={"system": "email"}),
    "phone":        SearchParam(None, "token", None, json_path="patients.telecoms", filter={"system": "phone"}),
    "address":      SearchParam(None, "string", None, json_path="patients.addresses"),
    "address-city": SearchParam(None, "string", None, json_path="patients.addresses[*].city"),
    "address-state": SearchParam(None, "string", None, json_path="patients.addresses[*].state"),
    "organization": SearchParam("managing_organization_id", "reference", "patients.managing_organization_id"),
    "general-practitioner": SearchParam("general_practitioner_id", "reference", "patients.general_practitioner_id"),
}

ENCOUNTER_SEARCH_PARAMS = {
    "_id":        SearchParam("encounter_id", "token", "encounters.encounter_id"),
    "patient":    SearchParam("subject_id", "reference", "encounters.subject_id"),
    "subject":    SearchParam("subject_id", "reference", "encounters.subject_id"),
    "status":     SearchParam("status", "token", "encounters.status"),
    "class":      SearchParam("class_code", "token", "encounters.class_code"),
    "type":       SearchParam("type_code", "token", "encounters.type_code"),
    "date":       SearchParam("period_start", "date", "encounters.period_start"),
    "practitioner": SearchParam(None, "reference", None, join="encounter_participants", join_col="practitioner_id"),
}

OBSERVATION_SEARCH_PARAMS = {
    "_id":           SearchParam("observation_id", "token", "observations.observation_id"),
    "patient":       SearchParam("subject_id", "reference", "observations.subject_id"),
    "subject":       SearchParam("subject_id", "reference", "observations.subject_id"),
    "code":          SearchParam("code", "token", "observations.code"),
    "status":        SearchParam("status", "token", "observations.status"),
    "date":          SearchParam("effective_date", "date", "observations.effective_date"),
    "value-quantity": SearchParam("value_quantity", "quantity", "observations.value_quantity"),
    "category":      SearchParam("category", "token", "observations.category"),
    "encounter":     SearchParam("encounter_id", "reference", "observations.encounter_id"),
}
```

---

## Search Parameter Types — Implementation

### String Parameters

```python
def apply_string(stmt, column, value: str, modifier: str | None):
    if modifier == "exact":
        return stmt.where(column == value)
    elif modifier == "contains":
        return stmt.where(column.ilike(f"%{value}%"))
    else:  # default: starts with (case-insensitive)
        return stmt.where(column.ilike(f"{value}%"))
```

### Token Parameters

```python
def apply_token(stmt, column, value: str, modifier: str | None):
    if "|" in value:
        system, code = value.split("|", 1)
        # system|code — both must match (stored in JSONB array)
        return stmt.where(
            column.contains([{"system": system, "code": code}])
        )
    elif value.startswith("|"):
        # |code — code only, any system
        return stmt.where(column.contains([{"code": value[1:]}]))
    else:
        # plain code match
        if modifier == "not":
            return stmt.where(column != value)
        elif modifier == "in":
            codes = value.split(",")
            return stmt.where(column.in_(codes))
        return stmt.where(column == value)
```

### Date Parameters

```python
PREFIXES = {"eq": "__eq__", "ne": "__ne__", "lt": "__lt__", "gt": "__gt__", "le": "__le__", "ge": "__ge__"}

def apply_date(stmt, column, value: str):
    prefix = value[:2] if value[:2] in PREFIXES else "eq"
    date_str = value[2:] if prefix != "eq" else value
    date = parse_fhir_date(date_str)
    op = PREFIXES[prefix]
    return stmt.where(getattr(column, op)(date))
```

### Reference Parameters

```python
def apply_reference(stmt, column, value: str):
    # "Patient/10001" or just "10001"
    if "/" in value:
        resource_type, resource_id = value.rsplit("/", 1)
        return stmt.where(column == int(resource_id))
    return stmt.where(column == int(value))
```

### Quantity Parameters

```python
def apply_quantity(stmt, value_col, unit_col, value: str):
    # Format: prefix + number + | + system + | + code
    # e.g. "lt100|mg" or "ge5.5|http://unitsofmeasure.org|mg"
    parts = value.split("|")
    numeric_str = parts[0]
    prefix = numeric_str[:2] if numeric_str[:2] in PREFIXES else "eq"
    number = float(numeric_str[2:] if prefix != "eq" else numeric_str)
    unit = parts[-1] if len(parts) > 1 else None
    stmt = apply_date(stmt, value_col, f"{prefix}{number}")  # reuse prefix logic
    if unit:
        stmt = stmt.where(unit_col == unit)
    return stmt
```

---

## `_include` and `_revinclude`

`_include` fetches referenced resources alongside the main result set:

```
GET /Encounter?patient=10001&_include=Encounter:patient
→ Returns Encounters AND the referenced Patient resource in the Bundle
```

`_revinclude` fetches resources that reference the results:

```
GET /Patient?_id=10001&_revinclude=Encounter:patient
→ Returns Patient AND all Encounters that reference it
```

### Implementation

```python
async def apply_include(results: list, includes: list[str], session) -> list:
    for include in includes:
        resource_type, param_name = include.split(":")
        search_param = SEARCH_PARAMS[resource_type][param_name]
        ids = [r.id for r in results if hasattr(r, search_param.column)]
        included = await session.execute(
            select(resource_model).where(resource_model.id.in_(ids))
        )
        results.extend(included.scalars().all())
    return results
```

---

## `_sort`

```
GET /Patient?_sort=family,-birthdate
→ ORDER BY family_name ASC, birth_date DESC
```

```python
def apply_sort(stmt, sort_str: str, search_params: dict):
    for param in sort_str.split(","):
        desc = param.startswith("-")
        name = param.lstrip("-")
        sp = search_params.get(name)
        if sp and sp.column:
            col = text(sp.column)
            stmt = stmt.order_by(col.desc() if desc else col.asc())
    return stmt
```

---

## `_filter` — Complex Filter Expressions

The `_filter` parameter allows complex boolean logic:

```
GET /Observation?_filter=code eq http://loinc.org|8867-4 and date ge 2024-01-01
```

This requires a mini-parser. Implement using `pyparsing` or a recursive descent parser.

---

## `_summary` Parameter

Returns abbreviated resource representations:

```
GET /Patient?_summary=true       → only mandatory + summary-marked fields
GET /Patient?_summary=count      → only returns the count, no data
GET /Patient?_summary=data       → all fields except narrative text
```

---

## `_elements` Parameter

Return only specified fields:

```
GET /Patient?_elements=id,name,birthDate
→ { "id": "10001", "name": [...], "birthDate": "1985-03-15" }
```

```python
def apply_elements(resource: dict, elements: str) -> dict:
    fields = elements.split(",") + ["resourceType", "id", "meta"]
    return {k: v for k, v in resource.items() if k in fields}
```

---

## CapabilityStatement — Advertising Search Params

The FHIR server must advertise which search parameters it supports:

```json
{
  "resourceType": "CapabilityStatement",
  "rest": [{
    "resource": [{
      "type": "Patient",
      "searchParam": [
        { "name": "family", "type": "string" },
        { "name": "birthdate", "type": "date" },
        { "name": "identifier", "type": "token" },
        { "name": "_include", "type": "special" }
      ]
    }]
  }]
}
```
