# Implementation Roadmap

This roadmap translates the gap analysis into a phased delivery plan.  
Each phase builds on the previous — phases are ordered by dependency and business value.

---

## Files in This Section

| File | Phase |
|---|---|
| [01-phase1-foundation.md](./01-phase1-foundation.md) | Phase 1 (Weeks 1-8): Security Foundation |
| [02-phase2-core-emr.md](./02-phase2-core-emr.md) | Phase 2 (Weeks 9-18): Core EMR Capabilities |
| [03-phase3-ai-emr.md](./03-phase3-ai-emr.md) | Phase 3 (Weeks 19-26): AI-Enabled EMR |
| [04-phase4-integrations.md](./04-phase4-integrations.md) | Phase 4 (Weeks 27-34): External Integrations |

---

## Summary Timeline

```
Week 1-8    Phase 1: Foundation
             ├── Resource version history + ETags
             ├── Automatic audit logging middleware
             ├── $validate operation
             ├── OAuth2 + SMART on FHIR
             ├── AccessPolicy (RBAC)
             ├── Security headers + rate limiting
             └── CapabilityStatement endpoint

Week 9-18   Phase 2: Core EMR
             ├── FHIR search parameters (full framework)
             ├── FHIR Subscriptions + REST-hook delivery
             ├── WebSocket server
             ├── $everything (patient export)
             ├── Terminology operations ($expand, $lookup, $validate-code)
             ├── Automation engine (bot framework)
             ├── CDS Hooks
             └── Bulk data export ($export)

Week 19-26  Phase 3: AI EMR
             ├── $ai operation (patient context injection)
             ├── Clinical NLP (condition/medication extraction)
             ├── Smart charting (ambient transcription)
             ├── AI CDS (risk stratification, differential diagnosis)
             ├── Patient/$match (deduplication)
             └── GraphQL API

Week 27-34  Phase 4: Integrations
             ├── HL7 v2 listener (MLLP + REST)
             ├── C-CDA export
             ├── DICOM/DICOMweb proxy
             ├── SCIM 2.0
             ├── SQL-on-FHIR views
             ├── FHIRCast hub
             └── SMART Health Cards
```

---

## Milestone Dependencies

```
Phase 1 completes → can safely deploy to production for early customers
Phase 2 completes → can replace a basic EMR workflow (scheduling, orders, documentation)
Phase 3 completes → AI-enabled EMR; clinical differentiation
Phase 4 completes → full interoperability; enterprise-ready
```
