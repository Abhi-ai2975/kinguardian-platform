# Bots & Automation Engine

Medplum's killer feature is *Bots* — serverless functions written in TypeScript that execute  
in response to FHIR resource changes. They are the programmable layer that turns a FHIR data  
store into an active clinical workflow engine.

---

## Files in This Section

| File | Topic |
|---|---|
| [01-bot-engine.md](./01-bot-engine.md) | Bot execution model, triggers, API, Python equivalent |
| [02-workflow-automation.md](./02-workflow-automation.md) | Clinical workflow automation patterns |
| [03-plan-definitions.md](./03-plan-definitions.md) | FHIR PlanDefinition — protocol-driven automation |

---

## What Bots Enable

| Bot Trigger | Bot Action | Use Case |
|---|---|---|
| `Observation` created | Check if value is critical; if so, create `Task` for nurse | Critical value alerting |
| `Appointment` created | Send SMS to patient | Appointment reminders |
| `Patient` created | Look up insurance coverage via API | Eligibility verification |
| `Encounter` closed | Generate billing `Claim` | Automated claim creation |
| `Condition` created | Check if on care gap list; if so, close gap | Quality measure automation |
| `MedicationRequest` created | Check drug-drug interactions | Safety alerting |
| `Task` completed | Trigger next task in protocol | Protocol adherence |

---

## Our Equivalent — Python Automation Functions

We don't need Lambda — we can execute Python functions in-process (for low-latency)  
or via a task queue (Celery/ARQ) for isolation.

The key architectural requirement is: **every FHIR mutation can trigger registered handlers**.
