# Consent — HIPAA Authorization + Research + Data Sharing

**FHIR R4 Spec:** https://www.hl7.org/fhir/R4/consent.html  
**Sequence Start:** 390000

---

## Why Consent Is Critical

`Consent` is not optional in a HIPAA-compliant EMR. Every clinical interaction requires documented consent for:
- **Treatment** — patient agrees to receive care from this organization
- **Privacy practices** — patient acknowledges HIPAA Notice of Privacy Practices
- **Research** — patient opts into research programs (IRB-approved)
- **Data sharing** — patient authorizes sharing records with third parties (insurers, family members, other providers)
- **Advance directives** — DNR, POLST, living will

Without a Consent resource, there is no way to programmatically enforce or audit patient authorization decisions.

---

## Key FHIR Fields

| Field | Type | Description |
|---|---|---|
| `status` | code | `draft` \| `proposed` \| `active` \| `rejected` \| `inactive` \| `entered-in-error` |
| `scope` | CodeableConcept | What kind of consent: `patient-privacy` \| `research` \| `adr` (advance directives) \| `treatment` |
| `category` | CodeableConcept[] | Further classification |
| `patient` | Reference(Patient) | Who the consent is for |
| `dateTime` | dateTime | When consent was given |
| `performer` | Reference[] | Who recorded the consent |
| `organization` | Reference(Organization)[] | Who is bound by the consent |
| `source[x]` | Attachment or Reference | Signed consent form (PDF, DocuSign URL, or QuestionnaireResponse) |
| `policy` | BackboneElement[] | Policy reference (HIPAA 45 CFR 164) |
| `provision` | BackboneElement | The actual permit/deny rule tree |
| `provision.type` | code | `permit` or `deny` |
| `provision.period` | Period | Consent validity window |
| `provision.actor` | BackboneElement[] | Who is granted/denied access |
| `provision.action` | CodeableConcept[] | What actions (disclose, correct, access) |
| `provision.purpose` | Coding[] | Purpose of use (treatment, research, payment) |
| `provision.dataPeriod` | Period | Range of data covered |
| `provision.data` | BackboneElement[] | Specific resources included/excluded |
| `provision.provision` | (recursive) | Nested rules for exceptions |

---

## Consent Scope Codes

| Scope | System Code | Meaning |
|---|---|---|
| Patient privacy | `patient-privacy` | HIPAA Notice of Privacy Practices acknowledgement |
| Research | `research` | Enrollment in a research protocol |
| Advance directive | `adr` | DNR, POLST, living will |
| Treatment | `treatment` | Agreement to receive care |

System: `http://terminology.hl7.org/CodeSystem/consentscope`

---

## DB Model Design

```python
# app/models/consent.py

class ConsentStatus(str, Enum):
    draft = "draft"
    proposed = "proposed"
    active = "active"
    rejected = "rejected"
    inactive = "inactive"
    entered_in_error = "entered-in-error"

class Consent(Base):
    __tablename__ = "consent"

    id = Column(BigInteger, primary_key=True)
    consent_id = Column(
        BigInteger, Sequence("consent_id_seq", start=390000),
        nullable=False, unique=True, index=True,
    )
    user_id = Column(String, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)

    status = Column(ENUM(ConsentStatus, name="consent_status", create_type=True), nullable=False)
    scope = Column(JSONB, nullable=False)              # CodeableConcept: patient-privacy, research, etc.
    category = Column(JSONB, nullable=False)           # [CodeableConcept]

    # Patient
    patient_id = Column(BigInteger, ForeignKey("patient.id"), nullable=False, index=True)
    patient = relationship("Patient", lazy="selectin")

    date_time = Column(TIMESTAMP(timezone=True))

    # Performers and organizations
    performer = Column(JSONB)                         # [Reference]
    organization = Column(JSONB)                      # [Reference(Organization)]

    # Source (signed consent form)
    source_attachment = Column(JSONB)                 # Attachment { contentType, url, title }
    source_reference_id = Column(BigInteger, ForeignKey("questionnaire_response.id"), index=True)
    source_reference = relationship("QuestionnaireResponse", lazy="selectin")

    # Policy
    policy = Column(JSONB)                            # [{ authority, uri }]
    policy_rule = Column(JSONB)                       # CodeableConcept

    # Provision tree (permit/deny rules)
    provision = Column(JSONB)                         # Full recursive provision structure

    # Validity
    validity_period_start = Column(TIMESTAMP(timezone=True))
    validity_period_end = Column(TIMESTAMP(timezone=True))

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
```

---

## Common Consent Examples

### 1. HIPAA Privacy Notice Acknowledgement

```json
POST /Consent
{
  "status": "active",
  "scope": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/consentscope", "code": "patient-privacy" }] },
  "category": [{ "coding": [{ "system": "http://loinc.org", "code": "59284-0", "display": "Consent Document" }] }],
  "patient": { "reference": "Patient/10001" },
  "dateTime": "2024-01-15T10:00:00Z",
  "organization": [{ "reference": "Organization/190001" }],
  "policy": [{ "authority": "https://www.hhs.gov/hipaa", "uri": "https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html" }],
  "provision": {
    "type": "permit",
    "period": { "start": "2024-01-15", "end": "2025-01-15" },
    "purpose": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason", "code": "TREAT" }]
  }
}
```

### 2. Research Consent (IRB Protocol)

```json
POST /Consent
{
  "status": "active",
  "scope": { "coding": [{ "code": "research" }] },
  "category": [{ "coding": [{ "code": "research" }] }],
  "patient": { "reference": "Patient/10001" },
  "dateTime": "2024-01-15T10:00:00Z",
  "policy": [{ "uri": "https://irb.university.edu/protocol/IRB-2024-001" }],
  "provision": {
    "type": "permit",
    "purpose": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason", "code": "HRESCH" }],
    "data": [
      { "meaning": "related", "reference": { "reference": "Patient/10001" } }
    ]
  }
}
```

### 3. Data Sharing Restriction (Patient Opts Out)

```json
POST /Consent
{
  "status": "active",
  "scope": { "coding": [{ "code": "patient-privacy" }] },
  "category": [{ "coding": [{ "code": "information-sharing" }] }],
  "patient": { "reference": "Patient/10001" },
  "dateTime": "2024-01-15T10:00:00Z",
  "provision": {
    "type": "deny",
    "actor": [{ "role": { "coding": [{ "code": "IRCP" }] }, "reference": { "reference": "Organization/other-org-id" } }],
    "action": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/consentaction", "code": "disclose" }] }]
  }
}
```

### 4. Advance Directive — DNR

```json
POST /Consent
{
  "status": "active",
  "scope": { "coding": [{ "code": "adr" }] },
  "category": [{ "coding": [{ "system": "http://snomed.info/sct", "code": "304251008", "display": "Resuscitation status" }] }],
  "patient": { "reference": "Patient/10001" },
  "dateTime": "2024-01-10T00:00:00Z",
  "sourceAttachment": { "contentType": "application/pdf", "url": "https://files.example.org/dnr/10001.pdf", "title": "DNR Order" },
  "provision": {
    "type": "deny",
    "action": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/consentaction", "code": "collect" }] }],
    "purpose": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason", "code": "ETREAT" }]
  }
}
```

---

## Consent Enforcement in the Access Control Layer

Once `Consent` resources exist, the access policy engine checks them before returning PHI:

```python
class ConsentEnforcer:
    async def can_access(
        self,
        requester_ref: str,
        patient_id: int,
        purpose: str,  # TREAT, HRESCH, PAYOR, etc.
    ) -> bool:
        consents = await self.consent_repo.list_active(patient_id)
        for consent in consents:
            provision = consent.provision or {}
            if self._matches_requester(provision, requester_ref):
                if self._matches_purpose(provision, purpose):
                    return provision.get("type") == "permit"
        return True  # default permit if no specific consent found (HIPAA treatment exception)
```

---

## Consent + Digital Signature (e-Consent)

For legally binding e-consent (via patient portal):

```python
# After patient signs via DocuSign / Adobe Sign webhook:
POST /Consent
{
  "sourceAttachment": {
    "contentType": "application/pdf",
    "url": "https://docusign.example.org/envelope/abc123/documents/1",
    "title": "Signed Consent Form — 2024-01-15",
    "hash": "BASE64_SHA256_OF_PDF"   # integrity verification
  }
}
```

---

## Estimated Effort

| Task | Days |
|---|---|
| DB model + migration | 0.5 |
| Schemas + mapper (provision recursion) | 1.5 |
| Repository + service + DI | 0.5 |
| Router (CRUD + list filters) | 0.5 |
| `ConsentEnforcer` integration | 1.5 |
| Tests (HIPAA + research scenarios) | 1 |
| **Total** | **5.5 days** |
