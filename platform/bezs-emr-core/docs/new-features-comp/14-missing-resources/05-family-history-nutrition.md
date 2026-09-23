# FamilyMemberHistory + NutritionOrder

**FHIR R4 Specs:**
- FamilyMemberHistory: https://www.hl7.org/fhir/R4/familymemberhistory.html  
- NutritionOrder: https://www.hl7.org/fhir/R4/nutritionorder.html

**Sequence Starts:** FamilyMemberHistory = 430000, NutritionOrder = 440000

---

## FamilyMemberHistory — Hereditary Risk & Family History

### What Is It?

`FamilyMemberHistory` captures the **medical history of a patient's relatives** — essential for hereditary risk assessment, genetic counseling screening, and population health programs. It tracks what conditions, procedures, or causes of death occurred in the patient's family.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `status` | code | `partial` \| `completed` \| `entered-in-error` \| `health-unknown` |
| `patient` | Reference(Patient) | The patient whose family is being described |
| `date` | dateTime | When the history was taken |
| `name` | string | Name of the family member |
| `relationship` | CodeableConcept | Relationship code (SNOMED or HL7 family code) |
| `sex` | CodeableConcept | Biological sex of the family member |
| `born[x]` | Period, date, or string | DOB or age at birth |
| `age[x]` | Age, Range, or string | Current age or age range |
| `estimatedAge` | boolean | True if age is an estimate |
| `deceased[x]` | boolean, Age, Range, date, or string | Death info |
| `reasonCode` | CodeableConcept[] | Why this history is being documented |
| `note` | Annotation[] | Additional notes |
| `condition` | BackboneElement[] | Conditions the family member had |
| `condition.code` | CodeableConcept | The condition (SNOMED / ICD-10) |
| `condition.outcome` | CodeableConcept | `deceased`, `permanent disability`, etc. |
| `condition.contributedToDeath` | boolean | Cause of death |
| `condition.onset[x]` | Age, Range, Period, string | When condition started |
| `condition.note` | Annotation[] | Notes about this condition |

### Relationship Codes

| Code | Relationship |
|---|---|
| `MTH` | Mother |
| `FTH` | Father |
| `SIBLING` | Sibling |
| `CHILD` | Child |
| `GRNDMTH` | Grandmother |
| `GRNDFTH` | Grandfather |
| `AUNT` | Aunt |
| `UNCLE` | Uncle |

System: `http://terminology.hl7.org/CodeSystem/v3-RoleCode`

### DB Model

```python
# app/models/family_member_history.py

class FamilyMemberHistoryStatus(str, Enum):
    partial = "partial"
    completed = "completed"
    entered_in_error = "entered-in-error"
    health_unknown = "health-unknown"

class FamilyMemberHistory(Base):
    __tablename__ = "family_member_history"

    id = Column(BigInteger, primary_key=True)
    family_member_history_id = Column(
        BigInteger, Sequence("family_member_history_id_seq", start=430000),
        nullable=False, unique=True, index=True,
    )
    user_id = Column(String, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)

    status = Column(ENUM(FamilyMemberHistoryStatus, name="family_member_history_status", create_type=True), nullable=False)

    patient_id = Column(BigInteger, ForeignKey("patient.id"), nullable=False, index=True)
    patient = relationship("Patient", lazy="selectin")

    date = Column(TIMESTAMP(timezone=True))
    name = Column(String)                     # Name of family member
    relationship = Column(JSONB, nullable=False)  # CodeableConcept
    sex = Column(JSONB)                       # CodeableConcept

    # Age / DOB
    born_period = Column(JSONB)               # { start, end }
    born_date = Column(String)                # "1950-06-15"
    born_string = Column(String)              # "approximately 1950"
    age_age = Column(JSONB)                   # { value, unit, system }
    age_range = Column(JSONB)                 # { low, high }
    age_string = Column(String)
    estimated_age = Column(Boolean, default=False)

    # Deceased
    deceased_boolean = Column(Boolean)
    deceased_age = Column(JSONB)
    deceased_range = Column(JSONB)
    deceased_date = Column(String)
    deceased_string = Column(String)

    reason_code = Column(JSONB)               # [CodeableConcept]
    reason_reference = Column(JSONB)          # [Reference]
    note = Column(JSONB)                      # [Annotation]

    # Conditions the family member had (stored as child table for queryability)
    # Alternative: store as JSONB for simplicity
    conditions = Column(JSONB)                # [{code, outcome, contributedToDeath, onsetAge, note}]

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
```

### Example

```json
POST /FamilyMemberHistory
{
  "status": "completed",
  "patient": { "reference": "Patient/10001" },
  "date": "2024-01-15T10:00:00Z",
  "name": "Margaret Smith",
  "relationship": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode", "code": "MTH", "display": "Mother" }] },
  "sex": { "coding": [{ "system": "http://hl7.org/fhir/administrative-gender", "code": "female" }] },
  "bornDate": "1952-03-10",
  "deceasedAge": { "value": 68, "unit": "years", "system": "http://unitsofmeasure.org", "code": "a" },
  "condition": [
    {
      "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "254837009", "display": "Malignant neoplasm of breast" }] },
      "contributedToDeath": true,
      "onsetAge": { "value": 62, "unit": "years" },
      "note": [{ "text": "ER+/PR+, stage III" }]
    },
    {
      "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "44054006", "display": "Type 2 diabetes mellitus" }] },
      "onset": { "ageAge": { "value": 55, "unit": "years" } }
    }
  ]
}
```

### Use in Risk Stratification

Family history integrates with `RiskAssessment` and AI CDS:

```python
# In CDS hook for patient-view:
family_history = await family_member_history_repo.list(patient_id=patient_id)
breast_cancer_family = any(
    condition.get("code", {}).get("coding", [{}])[0].get("code") == "254837009"
    for member in family_history
    for condition in (member.conditions or [])
)
if breast_cancer_family:
    yield CDSCard(
        summary="Hereditary breast cancer risk detected",
        detail="Patient's mother had breast cancer. Consider BRCA1/2 genetic testing referral per NCCN guidelines.",
        indicator="warning",
    )
```

---

## NutritionOrder — Diet & Nutritional Therapy Orders

### What Is It?

`NutritionOrder` represents a request for dietary intervention — placed by a physician and fulfilled by clinical nutrition/dietary services. It covers:
- **Oral diet modifications** (diabetic diet, low-sodium, renal diet, texture-modified)
- **Enteral nutrition** (tube feeding via NG tube, PEG, or J-tube)
- **Parenteral nutrition** (TPN/PPN via IV)
- **Nutritional supplements** (oral supplements like Ensure, Glucerna)

### Key Fields

| Field | Type | Description |
|---|---|---|
| `status` | code | `draft` \| `active` \| `on-hold` \| `revoked` \| `completed` \| `entered-in-error` \| `unknown` |
| `intent` | code | `proposal` \| `plan` \| `directive` \| `order` |
| `patient` | Reference(Patient) | Patient |
| `encounter` | Reference(Encounter) | Hospital encounter |
| `dateTime` | dateTime | When ordered |
| `orderer` | Reference(Practitioner) | Ordering physician |
| `allergyIntolerance` | Reference(AllergyIntolerance)[] | Known allergies to consider |
| `foodPreferenceModifier` | CodeableConcept[] | Patient preferences (dairy-free, kosher, halal) |
| `excludeFoodModifier` | CodeableConcept[] | Foods to exclude |
| `oralDiet` | BackboneElement | Oral diet specification |
| `oralDiet.type` | CodeableConcept[] | Diet type (diabetic, renal, cardiac) |
| `oralDiet.schedule` | Timing[] | Meal schedule |
| `oralDiet.nutrient` | BackboneElement[] | Specific nutrient restrictions |
| `oralDiet.texture` | BackboneElement[] | Food texture modifications |
| `oralDiet.fluidConsistencyType` | CodeableConcept[] | Liquid thickness |
| `supplement` | BackboneElement | Nutritional supplement |
| `supplement.type` | CodeableConcept | Type of supplement |
| `supplement.productName` | string | Brand name (e.g., "Ensure Plus") |
| `supplement.schedule` | Timing[] | When to give |
| `supplement.quantity` | SimpleQuantity | Amount per serving |
| `enteralFormula` | BackboneElement | Tube feeding specification |
| `enteralFormula.baseFormulaType` | CodeableConcept | Type of formula |
| `enteralFormula.additiveType` | CodeableConcept | Added modules |
| `enteralFormula.caloricDensity` | SimpleQuantity | kcal/mL |
| `enteralFormula.routeofAdministration` | CodeableConcept | NGT, PEG, J-tube |
| `enteralFormula.administration` | BackboneElement[] | Rate, volume, schedule |

### DB Model

```python
class NutritionOrderStatus(str, Enum):
    draft = "draft"
    active = "active"
    on_hold = "on-hold"
    revoked = "revoked"
    completed = "completed"
    entered_in_error = "entered-in-error"
    unknown = "unknown"

class NutritionOrder(Base):
    __tablename__ = "nutrition_order"

    id = Column(BigInteger, primary_key=True)
    nutrition_order_id = Column(
        BigInteger, Sequence("nutrition_order_id_seq", start=440000),
        nullable=False, unique=True, index=True,
    )
    user_id = Column(String, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)

    status = Column(ENUM(NutritionOrderStatus, name="nutrition_order_status", create_type=True), nullable=False)
    intent = Column(String, nullable=False, default="order")

    patient_id = Column(BigInteger, ForeignKey("patient.id"), nullable=False, index=True)
    patient = relationship("Patient", lazy="selectin")

    encounter_id = Column(BigInteger, ForeignKey("encounter.id"), index=True)
    encounter = relationship("Encounter", lazy="selectin")

    date_time = Column(TIMESTAMP(timezone=True), nullable=False)
    orderer_reference = Column(String)           # "Practitioner/30001"

    allergy_intolerance = Column(JSONB)          # [Reference(AllergyIntolerance)]
    food_preference_modifier = Column(JSONB)     # [CodeableConcept]
    exclude_food_modifier = Column(JSONB)        # [CodeableConcept]
    note = Column(JSONB)                         # [Annotation]

    # Diet components (one or more can be present)
    oral_diet = Column(JSONB)                    # Full oralDiet backbone
    supplement = Column(JSONB)                   # [supplement backbone]
    enteral_formula = Column(JSONB)              # enteralFormula backbone

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
```

### Examples

#### Diabetic Diet with Texture Modification

```json
POST /NutritionOrder
{
  "status": "active",
  "intent": "order",
  "patient": { "reference": "Patient/10001" },
  "encounter": { "reference": "Encounter/20001" },
  "dateTime": "2024-01-15T10:00:00Z",
  "orderer": { "reference": "Practitioner/30001" },
  "oralDiet": {
    "type": [
      { "coding": [{ "system": "http://snomed.info/sct", "code": "160670007", "display": "Low fat diet" }] },
      { "coding": [{ "system": "http://snomed.info/sct", "code": "11816003", "display": "Diet education" }] }
    ],
    "nutrient": [
      { "modifier": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-OrderableDrugForm", "code": "carbohydrate" }] }, "amount": { "value": 45, "unit": "grams", "system": "http://unitsofmeasure.org", "code": "g" } }
    ],
    "texture": [
      { "modifier": { "coding": [{ "system": "http://snomed.info/sct", "code": "228052004", "display": "Minced diet" }] } }
    ],
    "fluidConsistencyType": [
      { "coding": [{ "system": "http://snomed.info/sct", "code": "439021000124105", "display": "Moderately thick liquid" }] }
    ]
  }
}
```

#### Enteral Tube Feeding (NGT)

```json
POST /NutritionOrder
{
  "status": "active",
  "intent": "order",
  "patient": { "reference": "Patient/10001" },
  "enteralFormula": {
    "baseFormulaType": { "coding": [{ "system": "http://snomed.info/sct", "code": "6547210000124112", "display": "Diabetic formula" }] },
    "baseFormulaProductName": "Glucerna 1.5",
    "caloricDensity": { "value": 1.5, "unit": "kcal/mL" },
    "routeofAdministration": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration", "code": "NGT", "display": "Nasogastric tube" }] },
    "administration": [{
      "schedule": { "repeat": { "frequency": 1, "period": 1, "periodUnit": "h" } },
      "rateQuantity": { "value": 80, "unit": "mL/hr" }
    }],
    "maxVolumeToDeliver": { "value": 1920, "unit": "mL/day" },
    "administrationInstruction": "Continuous tube feed at 80 mL/hr for 24 hours. Hold for residual >200 mL."
  }
}
```

---

## Estimated Effort

| Resource | Days |
|---|---|
| `FamilyMemberHistory` full CRUD | 2 |
| `NutritionOrder` full CRUD | 2 |
| CDS integration (family history → risk cards) | 1 |
| **Total** | **5 days** |
