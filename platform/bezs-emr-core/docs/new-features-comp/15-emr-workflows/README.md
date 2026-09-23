# EMR-Specific Clinical Workflows

This section covers high-level clinical workflows that go beyond single FHIR resources — they involve orchestration of multiple resources, external system integrations, and regulatory compliance requirements.

---

## What Makes These "EMR Workflows"?

Unlike a generic FHIR server (which handles individual resource CRUD), an EMR must support complete clinical **workflows** — sequences of steps that involve clinical judgment, external systems, regulatory rules, and multiple FHIR resources changing state together.

---

## Workflows in This Section

| File | Workflow | Complexity | Priority |
|---|---|---|---|
| [01-eprescribing.md](./01-eprescribing.md) | Electronic Prescribing (NCPDP SCRIPT / Surescripts) | High | P0 |
| [02-prior-authorization.md](./02-prior-authorization.md) | Prior Authorization (Da Vinci PAS / X12 278) | Very High | P0 |
| [03-patient-messaging.md](./03-patient-messaging.md) | Patient Portal Secure Messaging | Medium | P1 |
| [04-referral-management.md](./04-referral-management.md) | Referral Lifecycle Management | Medium | P1 |
| [05-cpoe.md](./05-cpoe.md) | Computerized Physician Order Entry (CPOE) | High | P1 |

---

## Dependency Map

These workflows build on resources already in the server and those in section 14:

```
MedicationRequest ──→ ePrescribing (01)
ServiceRequest ──────→ Prior Auth (02) + CPOE (05) + Referral (04)
Communication ───────→ Patient Messaging (03) + Referral (04)
Task ────────────────→ All workflows (tracks status)
Claim ───────────────→ Prior Auth (02)
```

---

## Regulatory Requirements

| Workflow | Regulation | Who Enforces |
|---|---|---|
| ePrescribing controlled substances | DEA 21 CFR Part 1311 | State pharmacy boards |
| Prior authorization | CMS Interoperability Rule 2023 | CMS |
| Patient messaging | HIPAA §164.312(e) | HHS |
| Referral tracking | TEFCA / CommonWell | ONC |
| CPOE | Meaningful Use / MIPS | CMS |

---

## Architecture Pattern

All workflows use the same layered pattern but add **state machine orchestration**:

```
Router (validates input)
  → WorkflowService (state machine: pending → in-progress → complete)
      → Multiple FHIR resource services (creates/updates FHIR resources)
      → ExternalIntegrationService (Surescripts, X12, etc.)
      → TaskService (tracks progress)
      → NotificationService (alerts to relevant parties)
```

Each workflow step can be:
- **Synchronous** — immediate response (< 2s)
- **Asynchronous** — returns a Task, polled or subscribed for updates
- **Manual** — requires human action (prior auth review, referral acceptance)
