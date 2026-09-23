# Advanced AI-Enabled EMR

This section covers the features that differentiate a true AI-first EMR from one that simply wraps an LLM API. These capabilities are what companies like Nuance DAX, Suki, Abridge, Nabla, and Cohere Health are building — and what will define the next generation of clinical software.

---

## Why This Section Exists

Section 09 covers the foundational AI layer: client infrastructure, clinical NLP, smart charting, and AI CDS. This section covers the next tier — the features that turn "AI features in an EMR" into an "AI-native EMR":

| Section 09 (Foundation) | Section 17 (Advanced) |
|---|---|
| Whisper transcription → structured FHIR | Full ambient documentation (no button, continuous) |
| FHIR context injection into prompts | RAG over clinical knowledge + patient history |
| AI suggestions in CDS cards | Autonomous AI agents that take actions |
| Per-patient risk scores (sepsis, readmission) | Population health AI across all patients |
| AI safety filter | FDA SaMD compliance + AI governance framework |

---

## Files in This Section

| File | Topic |
|---|---|
| [01-ambient-documentation.md](./01-ambient-documentation.md) | Always-on ambient AI — Nuance DAX / Suki pattern |
| [02-rag-clinical-knowledge.md](./02-rag-clinical-knowledge.md) | RAG pipeline, vector store, clinical guideline retrieval |
| [03-ai-agents.md](./03-ai-agents.md) | Autonomous AI agents with human-in-the-loop approval |
| [04-population-health-ai.md](./04-population-health-ai.md) | Predictive dashboards, batch risk scoring, care gap AI |
| [05-fda-samd-governance.md](./05-fda-samd-governance.md) | FDA SaMD framework, AI model governance, drift detection |

---

## The AI EMR Vision

The goal is a system where:

1. **Clinicians never touch a keyboard during a visit** — ambient AI listens, documents, orders, and closes loops
2. **Every clinical decision is evidence-grounded** — RAG retrieves the latest guidelines, the patient's own history, and similar cases
3. **Routine administrative work is handled by agents** — prior auth, refill approvals, care gap outreach run autonomously with clinician oversight
4. **Population health is proactive, not reactive** — AI identifies who needs attention before they show up in the ED
5. **All AI decisions are auditable and regulatorily compliant** — FDA SaMD framework, full audit trail, drift monitoring

---

## Technology Stack for Advanced AI

| Component | Technology |
|---|---|
| Ambient audio processing | OpenAI Whisper (self-hosted) or AssemblyAI |
| Speaker diarization | pyannote.audio |
| Vector store | pgvector (PostgreSQL extension) or Qdrant |
| Embedding model | `text-embedding-3-large` (OpenAI) or `voyage-clinical-2` (Voyage AI, healthcare-tuned) |
| LLM orchestration | LangChain / LlamaIndex for RAG chains |
| Agent framework | Anthropic Claude tool use / OpenAI function calling |
| Batch ML scoring | Celery beat + scikit-learn / XGBoost |
| Model monitoring | Evidently AI or Arize AI |
| FDA audit trail | Immutable AuditEvent log (append-only PostgreSQL) |
