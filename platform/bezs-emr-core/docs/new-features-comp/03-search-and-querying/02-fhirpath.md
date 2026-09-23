# FHIRPath — Expression Language for FHIR Querying

**Spec:** https://www.hl7.org/fhirpath/  
**Medplum reference:** `packages/core/src/fhirpath/`

---

## What Is FHIRPath?

FHIRPath is a path-based expression language designed specifically for FHIR resources.  
It's used in:
- `_filter` search parameters
- Invariant constraints in StructureDefinition profiles
- CQL (Clinical Quality Language) for measures
- FHIR Mapping Language
- `$validate` profile checks

Example FHIRPath expressions:
```
Patient.name.family                          → get all family names
Patient.name.where(use='official').family    → only official name family
Observation.value.ofType(Quantity).value     → numeric value if it's a Quantity
Bundle.entry.resource.ofType(Patient)        → all Patient resources in a Bundle
name.exists() and birthDate.exists()         → check required fields exist
```

---

## FHIRPath Operators

| Operator | Example | Description |
|---|---|---|
| `.` | `Patient.name` | Child accessor |
| `[]` | `name[0]` | Index accessor |
| `where()` | `name.where(use='official')` | Filter collection |
| `exists()` | `identifier.exists()` | Check presence |
| `empty()` | `name.empty()` | Check empty |
| `count()` | `name.count() > 0` | Collection count |
| `first()` | `name.first()` | First element |
| `last()` | `name.last()` | Last element |
| `ofType()` | `value.ofType(Quantity)` | Type filter |
| `is()` | `value is Quantity` | Type check |
| `as()` | `value as Quantity` | Type cast |
| `and` | `a and b` | Boolean AND |
| `or` | `a or b` | Boolean OR |
| `not()` | `not(a)` | Boolean NOT |
| `=` | `status = 'active'` | Equality |
| `!=` | `status != 'inactive'` | Inequality |
| `<`, `>`, `<=`, `>=` | `value >= 100` | Comparison |
| `~` | `code ~ 'abc'` | Equivalent (ignores case) |
| `+`, `-`, `*`, `/` | `value * 2` | Arithmetic |
| `\|` | `name \| address` | Union |

---

## Implementation Plan

### Option 1: Use a Python FHIRPath Library

```bash
uv add fhirpathpy
```

```python
from fhirpathpy import compile

# Pre-compile expressions for reuse
get_patient_names = compile("Patient.name.family")
get_active_conditions = compile("entry.resource.ofType(Condition).where(clinicalStatus.coding.code='active')")

# Apply to FHIR resources (as dicts)
patient_fhir = to_fhir_patient(patient)
families = get_patient_names(patient_fhir)   # → ["Smith", "Jones"]
```

### Option 2: Custom FHIRPath Engine

Build a minimal FHIRPath evaluator targeting only the subset used in `_filter`:

```python
# app/core/fhirpath.py

class FHIRPathEvaluator:
    def evaluate(self, expression: str, resource: dict) -> list:
        tokens = self.tokenize(expression)
        return self._eval(tokens, [resource])

    def _eval(self, tokens: list, context: list) -> list:
        result = context
        for token in tokens:
            if token.type == "child":
                result = [item.get(token.value) for item in result if isinstance(item, dict)]
                result = [r for r in result if r is not None]
                result = self._flatten(result)
            elif token.type == "where":
                result = [item for item in result if self._eval_predicate(token.expression, item)]
            elif token.type == "ofType":
                result = [item for item in result if isinstance(item, dict) and item.get("resourceType") == token.value]
            elif token.type == "exists":
                return [bool(result)]
        return result
```

**Recommendation:** Use `fhirpathpy` for completeness and spec compliance.

---

## FHIRPath in `_filter` Search Parameter

The `_filter` search parameter uses a subset of FHIRPath for filtering:

```
GET /Observation?_filter=code eq http://loinc.org|8867-4 and subject eq Patient/10001
GET /Patient?_filter=name.family eq "Smith" and birthDate ge 1980-01-01
GET /Condition?_filter=clinicalStatus.coding.code eq "active"
```

### Parser

```python
# Minimal _filter parser
# Grammar: expr := term (('and' | 'or') term)*
#          term  := path op value
#          op    := 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'co' | 'sw' | 'ew' | 'pr' | 'po' | 'ss' | 'sb' | 'in' | 're'

class FilterParser:
    def parse(self, filter_str: str) -> FilterNode:
        ...

    def to_sql(self, node: FilterNode, search_params: dict, resource_type: str) -> WhereClause:
        ...
```

---

## FHIRPath in Profile Validation

When validating a resource against a StructureDefinition, constraints are expressed as FHIRPath:

```json
{
  "key": "pat-1",
  "severity": "error",
  "human": "SHALL at least contain a contact's details or a reference to an organization",
  "expression": "name.exists() or telecom.exists() or address.exists() or organization.exists()"
}
```

The `$validate` operation must evaluate these expressions:

```python
def check_constraint(resource: dict, constraint: dict) -> bool:
    evaluator = FHIRPathEvaluator()
    result = evaluator.evaluate(constraint["expression"], resource)
    return bool(result[0]) if result else False
```

---

## Using FHIRPath in Mappers

We can use FHIRPath to simplify our mapper functions:

```python
# Instead of: resource.get("name", [{}])[0].get("family")
# Use: fhirpath_eval("name.first().family", resource)

from fhirpathpy import compile

_get_family = compile("name.where(use='official').family | name.first().family")
family = _get_family(patient_fhir)[0] if _get_family(patient_fhir) else None
```

---

## FHIRPath Functions Reference

| Function | Return | Description |
|---|---|---|
| `exists()` | boolean | True if collection is non-empty |
| `empty()` | boolean | True if collection is empty |
| `count()` | integer | Size of collection |
| `distinct()` | collection | Remove duplicates |
| `where(criteria)` | collection | Filter by expression |
| `select(projection)` | collection | Map items |
| `all(criteria)` | boolean | True if all match |
| `any(criteria)` | boolean | True if any match |
| `first()` | item | First element |
| `last()` | item | Last element |
| `tail()` | collection | All but first |
| `skip(n)` | collection | Skip n elements |
| `take(n)` | collection | First n elements |
| `iif(condition, true, false)` | any | Conditional |
| `matches(regex)` | boolean | Regex test |
| `length()` | integer | String length |
| `today()` | date | Current date |
| `now()` | dateTime | Current datetime |
| `children()` | collection | All child nodes |
| `descendants()` | collection | All descendant nodes |
