# FHIR DB Model Designer

You are designing a SQLAlchemy ORM model for a **FHIR R4** resource in this project. Follow every rule below without deviation.

## Step 1 — Fetch the R4 spec first

The user will provide a FHIR resource name or URL. **Always fetch the R4 spec before doing anything else** — use `https://www.hl7.org/fhir/R4/<resource>.html`. Never use `https://www.hl7.org/fhir/<resource>.html` (that serves R5). Read the full element definition table — every field, cardinality, and type. Then fetch and read the R4 spec page for every named datatype used (Annotation, CodeableConcept, Timing, Dosage, Identifier, etc). Never model from memory. Note: `CodeableReference` does **not exist** in R4 — if you see it, you are reading R5.

## Step 2 — Map cardinality to storage

| FHIR cardinality | Storage |
|---|---|
| `1..1` or `0..1` | Flat columns on the main model table |
| `0..*` | Separate child table + one-to-many relationship |

Never put a `0..*` field in a single column. Exceptions (comma-separated Text): `instantiatesCanonical[]`, `instantiatesUri[]`, `daysOfWeek[]`, `HumanName.given[]`/`prefix[]`/`suffix[]`, `Address.line[]`.

## Step 3 — Apply type-specific storage rules

### Primitive (`string`, `boolean`, `dateTime`, `integer`, `decimal`, `uri`, `code`)
→ Single flat column with matching SQLAlchemy type.

### CodeableConcept (0..1)
→ Four flat columns: `<field>_system`, `<field>_code`, `<field>_display`, `<field>_text`.

### CodeableConcept[] (0..*)
→ Child table with: `coding_system`, `coding_code`, `coding_display`, `text`.

### Reference (0..1) — closed allowed types
→ Three flat columns: `<field>_type` (Enum), `<field>_id` (Integer), `<field>_display` (String).

### Reference (0..1) — open / any resource type
→ Same three columns but `<field>_type` is String, not Enum.

### Reference[] (0..*) — closed allowed types
→ Child table with: `reference_type` (Enum), `reference_id` (Integer), `reference_display` (String).
Even when only **one resource type** is allowed, still use a single-value Enum (never a plain Integer column like `episode_of_care_id`). This keeps the pattern uniform and makes the allowed type self-documenting.

### Reference[] (0..*) — open
→ Child table with: `reference_type` (String), `reference_id` (Integer), `reference_display` (String).

**Important:** the column names `reference_type`, `reference_id`, `reference_display` are **fixed** for every reference child table — regardless of the FHIR field name. For example, `Encounter.participant.actor` is stored as `reference_type`/`reference_id`/`reference_display` on the `encounter_participant` table, not `actor_type`/`actor_id`/`actor_display`. Use the field-specific prefix (`<field>_type`, `<field>_id`, `<field>_display`) only when a reference is a flat column on the **main** resource table (0..1) alongside other reference columns that need to be distinguished.

### CodeableReference (0..1 or 0..*) — R5
Both concept and reference halves in the same row:
```python
# concept half (CodeableConcept)
coding_system  = Column(String, nullable=True)
coding_code    = Column(String, nullable=True)
coding_display = Column(String, nullable=True)
text           = Column(String, nullable=True)
# reference half
reference_type    = Column(Enum(MyReferenceType, name="pg_type_name"), nullable=True)  # or String if open
reference_id      = Column(Integer, nullable=True)
reference_display = Column(String, nullable=True)
```

### Annotation (0..*)
→ Child table with: `text` (Text, NOT NULL), `time` (DateTime), `author_string` (String), `author_reference_type` (Enum or String), `author_reference_id` (Integer), `author_reference_display` (String).

### Identifier (0..*)
→ Child table with: `use`, `type_system`, `type_code`, `type_display`, `type_text`, `system`, `value`, `period_start`, `period_end`, `assigner`.

### Period (0..1)
→ Two flat columns: `<field>_start` (DateTime), `<field>_end` (DateTime).

### HumanName (0..*)
→ Child table. `given`, `prefix`, `suffix` are comma-separated Text (never individually filtered).

### choice type (`foo[x]`)
→ One column per variant, all nullable. Mapper uses whichever is non-null.

### BackboneElement (0..*)
→ Child table. Any `0..*` inside the BackboneElement becomes a grandchild table.

## Step 4 — Enum rules

Use `Enum(MyClass, name="pg_type_name")` when the allowed reference types are a **closed, known set**. Define the Python enum in `app/models/<resource>/enums.py`.

### Two enum patterns — key always equals value

**Reference type enums** (FHIR resource names): both name and value are the PascalCase FHIR resource name.

```python
class MyResourceFieldReferenceType(str, Enum):
    Condition = "Condition"
    PractitionerRole = "PractitionerRole"
```

**Status / code enums** (FHIR code values): both name and value are the same lowercase FHIR code string.

```python
class MyResourceStatus(str, Enum):
    active = "active"
    completed = "completed"
```

Because key = value in every enum, SQLAlchemy, the PostgreSQL enum type, and the FHIR output all use the same string — no mismatch is possible. Alembic autogenerate emits the correct values; no manual renaming needed.

Naming: `<Resource><Field>ReferenceType` in Python, `<table_name>_reference_type` as the PostgreSQL type name.

## Step 5 — Standard columns on every model

```python
id          = Column(Integer, primary_key=True, autoincrement=True, index=True)   # internal — never exposed
<res>_id    = Column(Integer, <seq>, server_default=<seq>.next_value(), unique=True, index=True, nullable=False)
user_id     = Column(String, nullable=True, index=True)
org_id      = Column(String, nullable=True, index=True)
created_at  = Column(DateTime(timezone=True), server_default=func.now())
updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
created_by  = Column(String, nullable=True)
updated_by  = Column(String, nullable=True)
```

Child tables must have: `id` (PK), `<parent>_id` (FK, indexed, NOT NULL), `org_id` (String, nullable). The parent declares `cascade="all, delete-orphan"`.

### CRITICAL: `org_id` / `user_id` are NOT FHIR Organization references

`user_id` and `org_id` on all tables are **tenant/auth fields** sourced from JWT claims. They are NOT FHIR data. Do not confuse them with FHIR Organization references that appear in the spec (e.g. `managingOrganization`, `serviceProvider`, `contact.organization`).

**FHIR Organization reference fields** must follow the same `_type` + `_id` + `_display` pattern as every other reference:
- Use the shared `OrganizationReferenceType` enum from `app/models/enums.py` (single value: `ORGANIZATION = "Organization"`)
- PostgreSQL type name: `organization_reference_type` (defined once, reused with `create_type=False` across all tables)
- `managing_organization_id` stores the **internal `organization.id` PK** (not the public `organization_id` sequence). Add a real `ForeignKey("organization.id")` with `index=True` and `lazy="selectin"` relationship.
- Example for a 0..1 Reference(Organization) on the main table:
```python
from app.models.enums import OrganizationReferenceType

managing_organization_type = Column(
    Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
    nullable=True,
)
managing_organization_id = Column(Integer, ForeignKey("organization.id"), nullable=True, index=True)
managing_organization_display = Column(String, nullable=True)
managing_organization = relationship("OrganizationModel", foreign_keys=[managing_organization_id], lazy="selectin")
```
- Input schema: `managing_organization: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/100'.")`
- Repository: parse the string → look up `organization.id` where `organization.organization_id == 100` → store internal PK
- Mapper FHIR output: navigate relationship → `f"Organization/{model.managing_organization.organization_id}"`
- Response schema: expose `managing_organization_type`, `managing_organization_id`, `managing_organization_display`

**This rule applies to ALL reference `_id` columns** — whether `encounter_id`, `subject_id`, `reference_id`, or any named reference column. They always store the **internal PK** (`resource.id`), never the public sequence ID. The public ID for FHIR output is always read through the relationship.

## Step 6 — Sequence allocation

Pick the next unused block from CLAUDE.md:
Patient=10000, Encounter=20000, Practitioner=30000, Appointment=40000, QR=60000, Vitals=70000, ServiceRequest=80000, MedicationRequest=90000, Procedure=100000, DiagnosticReport=110000, Condition=120000, DeviceRequest=130000, PractitionerRole=140000.

## Step 7 — Migration

After writing the model, generate a migration:
```
uv run alembic revision --autogenerate -m "<description>"
```

Autogenerate enum values are reliable (all enums use key = value convention — no name/value mismatch). Still update the generated file to use the `postgresql.ENUM` pattern for proper create/drop handling:
1. Replace `sa.Enum(...)` with `postgresql.ENUM(...)` at module level: `_my_enum = postgresql.ENUM('VALUE1', 'VALUE2', name='pg_type_name')`.
2. Call `_my_enum.create(op.get_bind(), checkfirst=True)` at the start of `upgrade()`.
3. Use `create_type=False` on any `add_column`/`alter_column` that references the type.
4. If converting VARCHAR → Enum, add `postgresql_using='col::pg_type_name'`.
5. In `downgrade()`, revert columns first, then call `_my_enum.drop(op.get_bind(), checkfirst=True)`.

Apply with: `uv run alembic upgrade head`

## Step 8 — Full stack checklist

After the model and migration, walk every layer:

- [ ] `app/models/<resource>/enums.py` — new Enum classes
- [ ] `app/models/<resource>/<resource>.py` — ORM model + child tables
- [ ] `app/models/<resource>/__init__.py` — exports
- [ ] `app/schemas/<resource>/input.py` — CreateSchema, PatchSchema; CodeableReference inputs include both concept and reference fields
- [ ] `app/schemas/fhir/<resource>.py` — FHIRXxxSchema, PlainXxxResponse, PaginatedXxxResponse, FHIRXxxBundle
- [ ] `app/fhir/mappers/<resource>.py` — to_fhir / to_plain; CodeableReference outputs `{"concept": {...}, "reference": {...}}`
- [ ] `app/repository/<resource>_repository.py` — CRUD, `_with_relationships`, `_apply_list_filters`, `_cast_ref_type` for closed-set enums
- [ ] Migration generated and manually fixed
- [ ] `uv run alembic upgrade head` applied

## Reminders

- **This project uses FHIR R4** — always fetch `https://www.hl7.org/fhir/R4/<resource>.html`. Never use `build.fhir.org` or `https://www.hl7.org/fhir/<resource>.html` (R5).
- **Never model from memory** — always fetch the spec URL first.
- **CodeableReference does not exist in R4** — in R4 use separate `reasonCode[]` + `reasonReference[]` arrays, separate `complication[]` + `complicationDetail[]`, separate `usedCode[]` + `usedReference[]`, etc.
- **Exception: PractitionerRole** — this project intentionally uses the R5 structure for PractitionerRole (contact + availability). Do not change it.
- **Enum values in autogenerate are correct** (key = value) — still apply the `postgresql.ENUM` create/drop pattern manually.
- **Verify imports compile** — run `uv run python -c "from app.models.<resource> import ..."` after writing.
