# C-CDA Export — Continuity of Care Document

**Standard:** https://www.hl7.org/ccdasearch/  
**FHIR → C-CDA:** https://www.hl7.org/fhir/us/ccda/  
**Medplum reference:** `packages/core/src/ccda/`

---

## What Is C-CDA?

C-CDA (Consolidated Clinical Document Architecture) is an XML document format for sharing  
clinical summaries between healthcare providers. It is the mandatory format for:
- Direct messaging between providers (Meaningful Use requirement)
- Referrals and care transitions
- Patient health record exchange (HIPAA)
- EHR certification (ONC requirement)

When a patient is discharged or referred to another provider, the sending system must generate  
a C-CDA document containing the patient's current clinical summary.

---

## C-CDA Document Types

| Document | LOINC | Used For |
|---|---|---|
| Continuity of Care Document (CCD) | 34133-9 | General care summary |
| Discharge Summary | 18842-5 | Hospital discharge |
| Progress Note | 11506-3 | Outpatient visit note |
| Consultation Note | 11488-4 | Specialist consultation |
| History and Physical | 34117-2 | Admission assessment |
| Referral Note | 57133-1 | Provider-to-provider referral |

---

## C-CDA Structure (CCD Example)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:sdtc="urn:hl7-org:sdtc">
  <realmCode code="US"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1"/>  <!-- US Realm Header -->
  <templateId root="2.16.840.1.113883.10.20.22.1.2"/>  <!-- CCD -->
  <id root="unique-document-uuid"/>
  <code code="34133-9" displayName="Summary of episode note" codeSystem="2.16.840.1.113883.6.1"/>
  <title>Summary of Care</title>
  <effectiveTime value="20240115103000+0000"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>
  <recordTarget>
    <patientRole>
      <id extension="10001" root="2.16.840.1.113883.19.5"/>
      <addr use="HP">
        <streetAddressLine>123 Main St</streetAddressLine>
        <city>Boston</city><state>MA</state><postalCode>02101</postalCode>
      </addr>
      <patient>
        <name use="L"><given>John</given><family>Smith</family></name>
        <administrativeGenderCode code="M" codeSystem="2.16.840.1.113883.5.1"/>
        <birthTime value="19850315"/>
      </patient>
    </patientRole>
  </recordTarget>
  <component>
    <structuredBody>
      <!-- Active Problems Section -->
      <component><section>
        <templateId root="2.16.840.1.113883.10.20.22.2.5.1"/>
        <code code="11450-4" displayName="Problem list" codeSystem="2.16.840.1.113883.6.1"/>
        <title>Problem List</title>
        <entry>
          <act classCode="ACT" moodCode="EVN">
            <observation classCode="OBS" moodCode="EVN">
              <code code="282291009" displayName="Diagnosis" codeSystem="2.16.840.1.113883.6.96"/>
              <value xsi:type="CD" code="44054006" displayName="Diabetes mellitus type 2" codeSystem="2.16.840.1.113883.6.96"/>
            </observation>
          </act>
        </entry>
      </section></component>
      <!-- Medications Section -->
      <!-- Allergies Section -->
      <!-- Results Section -->
      <!-- Vital Signs Section -->
      <!-- Immunizations Section -->
    </structuredBody>
  </component>
</ClinicalDocument>
```

---

## API — C-CDA Export

```
GET  /Patient/{id}/$summary?format=ccda         — Export patient CCD
GET  /Encounter/{id}/$summary?format=ccda       — Export encounter discharge summary
POST /Patient/{id}/$ccda                        — Generate C-CDA with specific sections
```

### Request

```
GET /Patient/10001/$summary
Accept: application/xml, text/xml
X-Output-Format: ccda
```

### Response

```
HTTP/1.1 200 OK
Content-Type: application/xml; charset=utf-8
Content-Disposition: attachment; filename="patient-10001-summary.xml"

<?xml version="1.0"...>
<ClinicalDocument...>
...
</ClinicalDocument>
```

---

## Implementation Plan

### Step 1 — Install XML Library

```bash
uv add lxml
```

### Step 2 — C-CDA Builder

```python
# app/services/ccda_service.py

from lxml import etree

CDA_NS = "urn:hl7-org:v3"
NSMAP = {None: CDA_NS, "xsi": "http://www.w3.org/2001/XMLSchema-instance"}

class CCDAService:
    async def generate_ccd(self, patient_id: int, user_id: str, org_id: str) -> bytes:
        """Generate a Continuity of Care Document for a patient."""
        patient = await self.patient_repo.get_by_public_id(patient_id, user_id, org_id)
        conditions = await self.condition_repo.list_by_patient(patient.id, status="active", ...)
        medications = await self.med_request_repo.list_by_patient(patient.id, status="active", ...)
        allergies = await self.allergy_repo.list_by_patient(patient.id, ...)
        observations = await self.obs_repo.list_by_patient(patient.id, limit=50, ...)
        immunizations = await self.immunization_repo.list_by_patient(patient.id, ...)

        root = etree.Element("ClinicalDocument", nsmap=NSMAP)
        self._add_header(root, patient)
        body = etree.SubElement(etree.SubElement(root, "component"), "structuredBody")
        self._add_problems_section(body, conditions)
        self._add_medications_section(body, medications)
        self._add_allergies_section(body, allergies)
        self._add_results_section(body, observations)
        self._add_immunizations_section(body, immunizations)

        return etree.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True)

    def _add_problems_section(self, body: etree.Element, conditions: list) -> None:
        section_el = etree.SubElement(etree.SubElement(body, "component"), "section")
        etree.SubElement(section_el, "templateId").set("root", "2.16.840.1.113883.10.20.22.2.5.1")
        code_el = etree.SubElement(section_el, "code")
        code_el.set("code", "11450-4")
        code_el.set("displayName", "Problem list")
        code_el.set("codeSystem", "2.16.840.1.113883.6.1")

        for condition in conditions:
            entry = etree.SubElement(section_el, "entry")
            act = etree.SubElement(entry, "act")
            act.set("classCode", "ACT")
            act.set("moodCode", "EVN")
            obs = etree.SubElement(act, "observation")
            obs.set("classCode", "OBS")
            obs.set("moodCode", "EVN")
            value_el = etree.SubElement(obs, "value")
            value_el.set("{http://www.w3.org/2001/XMLSchema-instance}type", "CD")
            if condition.snomed_code:
                value_el.set("code", condition.snomed_code)
                value_el.set("displayName", condition.display or "")
                value_el.set("codeSystem", "2.16.840.1.113883.6.96")
```

### Step 3 — Router

```python
@router.get("/Patient/{patient_id}/$summary", operation_id="patient_summary_ccda")
async def patient_summary(
    patient_id: int,
    request: Request,
    format: str = Query("fhir", alias="format"),
    svc=Depends(get_ccda_service),
):
    user = request.state.user
    accept = request.headers.get("accept", "")

    if format == "ccda" or "application/xml" in accept:
        ccda = await svc.generate_ccd(patient_id, user["sub"], user["activeOrganizationId"])
        return Response(
            content=ccda,
            media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename=patient-{patient_id}-summary.xml"},
        )
    # Otherwise return FHIR Bundle (Patient/$everything)
    return await patient_everything_svc.get_everything(patient_id, ...)
```

---

## C-CDA Validation

Generated C-CDA must be validated against the CCDA IG schematron:

```bash
# Use the CCDA schematron validator
pip install saxonpy
saxon.validate(ccda_xml, "ccda_schematron.sch")
```

Or use the open-source Java-based validator:
```bash
docker run --rm -v ./ccda.xml:/ccda.xml healthit/ccda-validator /ccda.xml
```

---

## FHIR to C-CDA Section Mapping

| C-CDA Section | LOINC | FHIR Resources |
|---|---|---|
| Active Problems | 11450-4 | `Condition` (clinical-status=active) |
| Medications | 10160-0 | `MedicationRequest` (status=active) |
| Allergies | 48765-2 | `AllergyIntolerance` |
| Vital Signs | 8716-3 | `Observation` (category=vital-signs) |
| Results | 30954-2 | `Observation` (category=laboratory), `DiagnosticReport` |
| Immunizations | 11369-6 | `Immunization` |
| Procedures | 47519-4 | `Procedure` |
| Encounters | 46240-8 | `Encounter` |
| Social History | 29762-2 | `Observation` (category=social-history) |
| Family History | 10157-6 | `FamilyMemberHistory` |
| Care Plan | 18776-5 | `CarePlan` |
