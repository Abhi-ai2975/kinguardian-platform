# Care Templates & Clinical Protocols

Care templates are pre-configured sets of clinical content (order sets, documentation templates,  
care plan activities) that can be applied to patients with specific conditions.

---

## Types of Care Templates

| Type | Description | FHIR Resource |
|---|---|---|
| Order Sets | Pre-configured groups of orders | `PlanDefinition` (type: order-set) |
| Care Protocols | Evidence-based care pathways | `PlanDefinition` (type: clinical-protocol) |
| Note Templates | Structured documentation templates | `Questionnaire` |
| Care Plan Templates | Chronic disease management plans | `PlanDefinition` (type: care-plan-template) |
| Discharge Instructions | Patient education materials | `DocumentReference` + `Communication` |

---

## Care Plan Template Design

### Diabetes Management Template

```json
{
  "resourceType": "PlanDefinition",
  "type": { "coding": [{ "code": "care-plan-template" }] },
  "title": "Type 2 Diabetes Management",
  "goal": [
    {
      "description": { "text": "HbA1c < 7.0%" },
      "target": [{ "measure": { "coding": [{ "system": "http://loinc.org", "code": "4548-4" }] }, "detailQuantity": { "value": 7, "comparator": "<", "unit": "%" } }]
    },
    {
      "description": { "text": "Blood pressure < 130/80 mmHg" }
    },
    {
      "description": { "text": "LDL < 100 mg/dL" }
    }
  ],
  "action": [
    { "title": "HbA1c monitoring", "timing": { "repeat": { "frequency": 1, "period": 3, "periodUnit": "mo" } }, "definitionCanonical": "ActivityDefinition/hba1c-check" },
    { "title": "Blood pressure check", "timing": { "repeat": { "frequency": 1, "period": 1, "periodUnit": "wk" } }, "definitionCanonical": "ActivityDefinition/bp-check" },
    { "title": "Foot exam", "timing": { "repeat": { "frequency": 1, "period": 1, "periodUnit": "a" } }, "definitionCanonical": "ActivityDefinition/foot-exam" },
    { "title": "Retinal exam", "timing": { "repeat": { "frequency": 1, "period": 1, "periodUnit": "a" } }, "definitionCanonical": "ActivityDefinition/retinal-exam" },
    { "title": "Diabetic education", "timing": { "repeat": { "frequency": 1, "period": 1, "periodUnit": "a" } }, "definitionCanonical": "ActivityDefinition/diabetes-education" },
    { "title": "Nephropathy screening (urine albumin)", "timing": { "repeat": { "frequency": 1, "period": 1, "periodUnit": "a" } } }
  ]
}
```

---

## Note Templates via Questionnaire

FHIR `Questionnaire` is the standard resource for structured data capture — including clinical notes.

### SOAP Note Template

```json
{
  "resourceType": "Questionnaire",
  "id": "soap-note-template",
  "title": "SOAP Note",
  "status": "active",
  "item": [
    {
      "linkId": "S",
      "text": "Subjective (Chief complaint, HPI, ROS)",
      "type": "text",
      "required": true
    },
    {
      "linkId": "O",
      "text": "Objective (Vital signs, Physical exam, Labs)",
      "type": "group",
      "item": [
        { "linkId": "O.vitals", "text": "Vital Signs", "type": "reference", "answerValueSet": "http://hl7.org/fhir/ValueSet/observation-vitalsigns" },
        { "linkId": "O.exam", "text": "Physical Exam", "type": "text" }
      ]
    },
    {
      "linkId": "A",
      "text": "Assessment (Diagnoses, Problem list updates)",
      "type": "text",
      "required": true
    },
    {
      "linkId": "P",
      "text": "Plan (Orders, Referrals, Follow-up)",
      "type": "text",
      "required": true
    }
  ]
}
```

When a clinician fills this out, a `QuestionnaireResponse` is stored.  
Our automation engine converts it to a `DocumentReference` with full narrative text.

---

## Template Library API

```
GET    /PlanDefinition?type=care-plan-template           — Browse care templates
GET    /PlanDefinition?type=order-set                    — Browse order sets
GET    /Questionnaire?context-type=encounter             — Browse note templates
POST   /PlanDefinition/{id}/$apply                       — Apply template to patient
GET    /PlanDefinition?_text=diabetes                    — Search templates
```

---

## AI-Generated Note Templates

With our `$ai` integration, we can generate note templates from scratch:

```python
@automation.on("Encounter?status=finished")
async def ai_generate_note_template(ctx: AutomationContext):
    encounter = ctx.resource
    chief_complaint = encounter.get("reasonCode", [{}])[0].get("text", "")

    template = await ctx.ai_client.complete(
        model="claude-sonnet-4-6",
        system="You are a clinical documentation specialist. Generate a structured SOAP note template.",
        prompt=f"Generate a SOAP note template for a patient presenting with: {chief_complaint}",
    )
    # Store as Questionnaire template
    ...
```

---

## Template Versioning

Clinical protocols evolve — templates must be versioned:

```json
{
  "resourceType": "PlanDefinition",
  "version": "2024.1",
  "status": "active",
  "experimental": false,
  "date": "2024-01-01",
  "publisher": "Acme Health Clinic",
  "effectivePeriod": { "start": "2024-01-01", "end": "2024-12-31" }
}
```

Template CRUD should use semantic versioning and preserve old versions when updating.

---

## Template Sharing

Templates can be shared across organizations or imported from national libraries:

```
POST /PlanDefinition/$import
{
  "parameter": [{ "name": "url", "valueUri": "https://hl7.org/fhir/us/core/PlanDefinition/..." }]
}
```

Future: integrate with **FHIR Registry** (registry.fhir.org) to browse published protocols.
