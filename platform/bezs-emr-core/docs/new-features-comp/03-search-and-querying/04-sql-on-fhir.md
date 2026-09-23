# SQL-on-FHIR — Flat Views for Analytics

**Spec:** https://build.fhir.org/ig/FHIR/sql-on-fhir-v2/  
**Medplum reference:** `packages/core/src/sql-on-fhir/`

---

## What Is SQL-on-FHIR?

SQL-on-FHIR (SoF) is a HL7 specification that defines *ViewDefinitions* — flat, tabular projections  
of FHIR resources that can be queried with standard SQL.

FHIR is hierarchical and JSON-based — not ideal for analytics. SQL-on-FHIR creates flat tables:

```
patients_view:
  patient_id | family_name | given_name | birthdate | gender | city  | state | mrn
  10001      | Smith       | John       | 1985-03-15 | male  | NYC   | NY   | MRN001
  10002      | Jones       | Jane       | 1990-07-22 | female | LA   | CA   | MRN002
```

This flat table can then be loaded into BigQuery, Snowflake, DuckDB, or any SQL engine.

---

## ViewDefinition Resource

A ViewDefinition is a FHIR extension resource that defines the flattening:

```json
{
  "resourceType": "ViewDefinition",
  "name": "patient_demographics",
  "resource": "Patient",
  "select": [
    { "column": [{ "name": "patient_id", "path": "id" }] },
    { "column": [{ "name": "family_name", "path": "name.where(use='official').family | name.first().family" }] },
    { "column": [{ "name": "given_name", "path": "name.where(use='official').given.first() | name.first().given.first()" }] },
    { "column": [{ "name": "birthdate", "path": "birthDate" }] },
    { "column": [{ "name": "gender", "path": "gender" }] },
    {
      "forEach": "address",
      "column": [
        { "name": "city", "path": "city" },
        { "name": "state", "path": "state" },
        { "name": "postal_code", "path": "postalCode" }
      ]
    },
    {
      "forEach": "identifier.where(system='http://example.org/mrn')",
      "column": [{ "name": "mrn", "path": "value" }]
    }
  ],
  "where": [{ "path": "active = true" }]
}
```

---

## Key ViewDefinition Concepts

### `select`

Defines columns. Can be:
- `column` — one column from a path
- `forEach` — unnest an array into multiple rows
- `forEachOrNull` — unnest but emit a NULL row if empty

### `where`

Filter which resources to include. FHIRPath expression.

### `constant`

Define constants used in expressions:
```json
{ "constant": [{ "name": "mrn_system", "valueUri": "http://example.org/mrn" }] }
```

---

## Predefined Views for Our Resources

### `patient_flat`

```json
{
  "name": "patient_flat",
  "resource": "Patient",
  "select": [
    { "column": [
      { "name": "id", "path": "id" },
      { "name": "family", "path": "name.family.first()" },
      { "name": "given", "path": "name.given.first()" },
      { "name": "birthdate", "path": "birthDate" },
      { "name": "gender", "path": "gender" },
      { "name": "active", "path": "active" }
    ]},
    { "forEach": "telecom.where(system='email')", "column": [{ "name": "email", "path": "value" }] },
    { "forEach": "identifier", "column": [{ "name": "identifier_system", "path": "system" }, { "name": "identifier_value", "path": "value" }] }
  ]
}
```

### `encounter_flat`

```json
{
  "name": "encounter_flat",
  "resource": "Encounter",
  "select": [
    { "column": [
      { "name": "id", "path": "id" },
      { "name": "patient_id", "path": "subject.id" },
      { "name": "status", "path": "status" },
      { "name": "class_code", "path": "class.code" },
      { "name": "period_start", "path": "period.start" },
      { "name": "period_end", "path": "period.end" }
    ]},
    { "forEach": "type", "column": [{ "name": "type_code", "path": "coding.code.first()" }, { "name": "type_display", "path": "coding.display.first()" }] }
  ]
}
```

### `observation_flat`

```json
{
  "name": "observation_flat",
  "resource": "Observation",
  "select": [
    { "column": [
      { "name": "id", "path": "id" },
      { "name": "patient_id", "path": "subject.id" },
      { "name": "loinc_code", "path": "code.coding.where(system='http://loinc.org').code.first()" },
      { "name": "display", "path": "code.coding.display.first()" },
      { "name": "value_numeric", "path": "value.ofType(Quantity).value" },
      { "name": "value_unit", "path": "value.ofType(Quantity).unit" },
      { "name": "value_string", "path": "value.ofType(string)" },
      { "name": "effective_date", "path": "effective.ofType(dateTime)" },
      { "name": "status", "path": "status" }
    ]}
  ]
}
```

---

## Implementation Plan

### Step 1 — ViewDefinition Engine

```python
# app/services/sql_on_fhir_service.py

from fhirpathpy import compile

class ViewDefinitionEngine:
    def apply(self, view_def: dict, resources: list[dict]) -> list[dict]:
        """Apply a ViewDefinition to a list of FHIR resources, returning flat rows."""
        rows = []
        where_expr = self._compile_where(view_def)

        for resource in resources:
            if where_expr and not where_expr(resource)[0]:
                continue
            resource_rows = self._process_select(view_def["select"], resource)
            rows.extend(resource_rows)
        return rows

    def _process_select(self, select: list, context: dict) -> list[dict]:
        base_row = {}
        exploded_rows = [{}]

        for sel in select:
            if "column" in sel:
                for col in sel["column"]:
                    path_fn = compile(col["path"])
                    values = path_fn(context)
                    value = values[0] if values else None
                    for row in exploded_rows:
                        row[col["name"]] = value
            elif "forEach" in sel:
                path_fn = compile(sel["forEach"])
                items = path_fn(context) or []
                new_rows = []
                for item in items:
                    for existing_row in exploded_rows:
                        new_row = dict(existing_row)
                        for col in sel["column"]:
                            col_fn = compile(col["path"])
                            values = col_fn(item)
                            new_row[col["name"]] = values[0] if values else None
                        new_rows.append(new_row)
                exploded_rows = new_rows if new_rows else exploded_rows

        return exploded_rows
```

### Step 2 — SQL View Creation

Generate PostgreSQL views from ViewDefinitions:

```python
# app/services/view_materialization_service.py

class ViewMaterializationService:
    async def create_pg_view(self, view_name: str, rows: list[dict]) -> None:
        """Write flat data to a PostgreSQL materialized view table."""
        async with self.session_factory() as session:
            # Create table if not exists
            cols = list(rows[0].keys()) if rows else []
            col_defs = ", ".join(f"{c} TEXT" for c in cols)
            await session.execute(text(f"""
                CREATE TABLE IF NOT EXISTS analytics_{view_name} ({col_defs});
            """))
            # Insert rows
            await session.execute(
                insert(text(f"analytics_{view_name}")),
                rows,
            )
```

### Step 3 — Export API

```python
@router.post("/ViewDefinition/$apply", operation_id="apply_view_definition")
async def apply_view(body: dict, svc=Depends(get_sof_service)):
    """Apply a ViewDefinition and return flat rows as NDJSON."""
    view_def = body  # ViewDefinition resource
    resource_type = view_def["resource"]
    resources = await fetch_all_fhir(resource_type)
    rows = svc.apply(view_def, resources)
    ndjson = "\n".join(json.dumps(row) for row in rows)
    return Response(content=ndjson, media_type="application/x-ndjson")
```

---

## Analytics Use Cases

With SQL-on-FHIR views loaded into a data warehouse:

```sql
-- Diabetes patients with recent HbA1c
SELECT p.family, p.given, p.birthdate, o.value_numeric, o.effective_date
FROM patient_flat p
JOIN observation_flat o ON p.id = o.patient_id
WHERE o.loinc_code = '4548-4'   -- HbA1c
  AND o.effective_date > NOW() - INTERVAL '1 year'
  AND o.value_numeric > 7.0
ORDER BY o.value_numeric DESC;

-- Encounter volume by month
SELECT DATE_TRUNC('month', period_start) as month, COUNT(*) as encounters
FROM encounter_flat
WHERE period_start > '2024-01-01'
GROUP BY 1 ORDER BY 1;
```

---

## Integration with Data Warehouses

| Platform | Method |
|---|---|
| BigQuery | Export NDJSON to GCS, load with `bq load` |
| Snowflake | Export NDJSON to S3, `COPY INTO` |
| DuckDB | Load NDJSON directly: `SELECT * FROM read_ndjson_auto('patients.ndjson')` |
| Postgres | `COPY analytics_patient_flat FROM 'flat.csv' CSV` |
| Apache Spark | Load NDJSON as Spark DataFrame |
