# Phase 3 — AI-Enabled EMR (Weeks 19–26)

**Goal:** Differentiate from standard FHIR servers with AI-powered clinical intelligence.  
**Prerequisite:** Phases 1 and 2 complete.

---

## Week 19-20 — AI Infrastructure

| Task | Effort |
|---|---|
| `AIClient` — Anthropic + OpenAI clients | 1 day |
| `ClinicalContextBuilder` — patient FHIR context injection | 2 days |
| `$ai` operation router (non-streaming + streaming SSE) | 1 day |
| `Patient/{id}/$ai` with context | 1 day |
| `TokenBudgetManager` + usage tracking | 1 day |
| AI streaming WebSocket (`/ws/realtime`) | 1 day |
| AuditEvent for every AI call | 1 day |
| `AIUsageLog` table + dashboard endpoint | 1 day |

---

## Week 21-22 — Clinical NLP

| Task | Effort |
|---|---|
| `ConditionExtractor` — free text → SNOMED Conditions | 2 days |
| `MedicationExtractor` — free text → MedicationRequests | 2 days |
| `ICD10Coder` — description → ICD-10 suggestions | 1 day |
| `Deidentifier` — PHI removal for research | 1 day |
| `POST /$nlp-analyze` endpoint | 1 day |
| `POST /$snomed-normalize` endpoint | 1 day |
| `POST /$suggest-icd10` endpoint | 0.5 day |

---

## Week 23-24 — Smart Charting

| Task | Effort |
|---|---|
| `TranscriptionService` (Whisper integration) | 1 day |
| `EncounterExtractor` — transcript → structured FHIR | 2 days |
| `SmartChartingService` — draft resource creation | 2 days |
| `/ws/transcribe` WebSocket for real-time transcription | 2 days |
| `POST /Encounter/{id}/$generate-note` | 1 day |
| `POST /Questionnaire/{id}/$ai-prefill` | 1 day |

---

## Week 25-26 — AI CDS + Advanced Operations

| Task | Effort |
|---|---|
| Sepsis risk prediction automation handler | 2 days |
| `POST /Patient/{id}/$differential-diagnosis` | 1 day |
| `POST /Patient/{id}/$treatment-recommendation` | 1 day |
| `POST /Patient/{id}/$medication-review` | 1 day |
| `Patient/$match` operation (probabilistic matching) | 3 days |
| GraphQL API (Strawberry, basic queries) | 3 days |
| `Patient/me/$ai-chat` (patient portal AI) | 1 day |

---

## Definition of Done — Phase 3

- [ ] `POST /Patient/10001/$ai` returns clinical summary
- [ ] `POST /Patient/10001/$ai` with streaming returns SSE chunks
- [ ] `POST /$nlp-analyze` extracts conditions from note text
- [ ] Ambient transcription extracts medications + orders from speech
- [ ] `/ws/transcribe` streams partial transcriptions
- [ ] `POST /Patient/10001/$differential-diagnosis` returns ranked differentials
- [ ] `POST /Patient/$match` returns ranked patient matches
- [ ] Critical vital sign creates automated urgent Task
- [ ] GraphQL `{ Patient(id: "10001") { name { family } ConditionList { code { text } } } }` works

---

## AI Safety Checklist

Before shipping any AI feature to production:

- [ ] AI output never presented as diagnosis (disclaimer added)
- [ ] Every AI call logged to AuditEvent
- [ ] Token usage tracked for cost management
- [ ] BAA signed with all AI providers
- [ ] PHI scrubbed from application logs
- [ ] Rate limits prevent runaway AI spend
- [ ] Error handling: AI failure doesn't block clinical workflow
- [ ] Privacy mode: option to use local model (Ollama) for sensitive data
