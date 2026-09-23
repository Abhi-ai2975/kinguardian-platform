# GraphQL API

**FHIR Spec:** https://www.hl7.org/fhir/R4/graphql.html  
**Medplum reference:** `packages/server/src/fhir/graphql.ts`

---

## Why GraphQL?

REST + FHIR is powerful but verbose for UI use cases. A clinical dashboard may need:
- Patient name + demographics
- Last 5 encounters
- Active conditions
- Current medications
- Recent lab values

This requires 5+ REST calls, each returning full resources with many unused fields.  
With GraphQL, one query fetches exactly what you need in one round-trip.

---

## FHIR GraphQL Operation

```
POST /$graphql
Content-Type: application/json

{
  "query": "..."
}
```

Or via GET:
```
GET /$graphql?query={Patient(id:"10001"){name{family,given},birthDate}}
```

---

## Example Queries

### Get a Patient with Related Encounters

```graphql
query PatientWithEncounters {
  Patient(id: "10001") {
    id
    name {
      family
      given
    }
    birthDate
    gender
    EncounterList(_count: 5, _sort: "-date") {
      id
      status
      class {
        code
        display
      }
      period {
        start
        end
      }
    }
  }
}
```

### Get Observations with Filtering

```graphql
query LabResults {
  ObservationList(
    subject: "Patient/10001",
    code: "http://loinc.org|2345-7",
    _count: 10
  ) {
    id
    effectiveDateTime
    valueQuantity {
      value
      unit
    }
    interpretation {
      coding {
        code
        display
      }
    }
  }
}
```

### Clinical Summary

```graphql
query ClinicalSummary {
  Patient(id: "10001") {
    id
    name { family given }
    birthDate
    ConditionList(clinicalStatus: "active") {
      id
      code { coding { system code display } }
      onsetDateTime
    }
    MedicationRequestList(status: "active") {
      id
      medicationCodeableConcept { coding { code display } }
      dosageInstruction { text }
    }
    AllergyIntoleranceList {
      id
      code { coding { code display } }
      reaction { manifestation { coding { code display } } }
    }
  }
}
```

---

## GraphQL Schema Generation

The FHIR GraphQL schema is generated from FHIR resource definitions. Key patterns:

### Resource Type

```graphql
type Patient {
  id: ID
  meta: Meta
  name: [HumanName]
  birthDate: Date
  gender: code
  active: Boolean
  identifier: [Identifier]
  telecom: [ContactPoint]
  address: [Address]

  # Reverse references (generated from search params)
  EncounterList(status: String, _count: Int, _sort: String): [Encounter]
  ConditionList(clinicalStatus: String, _count: Int): [Condition]
  ObservationList(code: String, date: String, _count: Int): [Observation]
  MedicationRequestList(status: String, _count: Int): [MedicationRequest]
}

type Query {
  Patient(id: ID!): Patient
  PatientList(
    family: String, given: String, birthdate: String,
    _count: Int, _offset: Int, _sort: String
  ): PatientConnection
}

type PatientConnection {
  total: Int
  offset: Int
  nodes: [Patient]
}
```

---

## Implementation Plan

### Step 1 — Install Strawberry or Ariadne

```bash
uv add strawberry-graphql
# or
uv add ariadne
```

**Recommendation:** Use Strawberry (code-first, Python type hints, async native).

### Step 2 — Generate FHIR Types

```python
# app/graphql/types/patient.py
import strawberry
from typing import Optional, List

@strawberry.type
class HumanName:
    family: Optional[str]
    given: Optional[List[str]]
    use: Optional[str]

@strawberry.type
class Patient:
    id: str
    name: Optional[List[HumanName]]
    birth_date: Optional[str] = strawberry.field(name="birthDate")
    gender: Optional[str]
    active: Optional[bool]

    @strawberry.field
    async def encounter_list(
        self,
        info: strawberry.types.Info,
        status: Optional[str] = None,
        count: int = strawberry.argument(default=10, name="_count"),
    ) -> List["Encounter"]:
        repo = info.context["encounter_repo"]
        return await repo.list_by_patient(int(self.id), status=status, limit=count)
```

### Step 3 — Schema and Resolvers

```python
# app/graphql/schema.py
import strawberry
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Query:
    @strawberry.field
    async def patient(self, info: strawberry.types.Info, id: str) -> Optional[Patient]:
        repo = info.context["patient_repo"]
        patient = await repo.get_by_public_id(int(id), ...)
        return to_graphql_patient(patient) if patient else None

    @strawberry.field
    async def patient_list(
        self,
        info: strawberry.types.Info,
        family: Optional[str] = None,
        count: int = strawberry.argument(default=50, name="_count"),
    ) -> PatientConnection:
        repo = info.context["patient_repo"]
        total, patients = await repo.list(family=family, limit=count, ...)
        return PatientConnection(total=total, nodes=[to_graphql_patient(p) for p in patients])

schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)
```

### Step 4 — Mount on FHIR Router

```python
# app/main.py
from app.graphql.schema import graphql_app

app.include_router(graphql_app, prefix="/$graphql")
app.include_router(graphql_app, prefix="/graphql")   # convenience alias
```

---

## Introspection & GraphiQL

Strawberry automatically provides:
- **Introspection** at `POST /$graphql` with `{"query": "{__schema{types{name}}}"}`
- **GraphiQL UI** at `GET /$graphql` (browser opens interactive explorer)

---

## Authorization in GraphQL

Apply access policies at the resolver level:

```python
@strawberry.type
class Query:
    @strawberry.field
    async def patient(self, info: strawberry.types.Info, id: str) -> Optional[Patient]:
        user = info.context["user"]
        policies = info.context["policies"]
        if not policy_engine.can_read(policies, "Patient"):
            raise PermissionError("Cannot read Patient")
        ...
```

---

## Subscription Support

Strawberry supports GraphQL subscriptions via WebSocket:

```graphql
subscription PatientUpdates {
  patientUpdated(id: "10001") {
    id
    name { family }
    meta { lastUpdated }
  }
}
```

This requires our FHIR Subscriptions system (see `04-subscriptions-and-realtime/`).

---

## Performance Considerations

- Use DataLoader pattern to batch N+1 queries:

```python
from strawberry.dataloader import DataLoader

async def load_encounters_batch(patient_ids: list[str]) -> list[list[Encounter]]:
    encounters = await encounter_repo.list_by_patient_ids(patient_ids)
    # Group by patient
    grouped = defaultdict(list)
    for enc in encounters:
        grouped[str(enc.patient_id)].append(enc)
    return [grouped.get(pid, []) for pid in patient_ids]

encounter_loader = DataLoader(load_fn=load_encounters_batch)
```

- Cache schema compilation: schema is stateless, generate once at startup
- Set query depth limits to prevent malicious deep queries
- Set query complexity limits
