# RAG — Retrieval-Augmented Generation for Clinical AI

**Tech:** pgvector + PostgreSQL, LangChain, Claude claude-opus-4-8  
**Status:** Not implemented  
**Comparable:** Epic Cosmos, IBM Watson Health, Cohere Coral

---

## Why RAG?

The current AI implementation in section 09 injects raw FHIR JSON into a prompt. That works for simple queries but breaks down for complex clinical questions:

| Problem | Without RAG | With RAG |
|---|---|---|
| "What's the guideline for HbA1c targets in elderly diabetics?" | Hallucinated answer | Retrieved from ADA 2024 guidelines |
| "Has this patient had a similar presentation before?" | Only current encounter context | Searches all 8 years of patient history semantically |
| "What do other patients with this profile typically receive?" | No population context | Retrieves similar cases from de-identified dataset |
| Context window limit | Truncated patient history | Retrieves only the most relevant past data |
| Outdated training data | LLM knowledge cutoff | Always current (guidelines updated in vector store) |

RAG = **Retrieve relevant context first, then generate** — grounding the AI in facts rather than relying on parametric memory.

---

## Knowledge Sources to Index

| Source | Content | Update Frequency |
|---|---|---|
| **Clinical Guidelines** | ADA, ACC/AHA, USPSTF, NCCN, ACS | Quarterly |
| **Drug Information** | FDA drug labels, RxNorm, DDI database | Monthly |
| **Patient History** | All FHIR resources for each patient | Real-time |
| **Lab Reference Ranges** | LOINC normal values, critical values | Annual |
| **ICD-10 / SNOMED** | Clinical term definitions, hierarchies | Annual |
| **Local Formulary** | Payer-approved drugs, prior auth rules | Monthly |
| **Clinical Literature** | PubMed abstracts (curated) | Weekly |

---

## Architecture

```
                    ┌─────────────────────────────┐
                    │   Knowledge Ingestion        │
                    │   Pipeline (background job)  │
                    └──────────┬──────────────────┘
                               │ chunks + embed
                               ▼
┌──────────────────────────────────────────────────┐
│                  pgvector Store                   │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  guidelines  │  │patient_chunks│              │
│  │  embeddings  │  │  embeddings  │  ...         │
│  └──────────────┘  └──────────────┘              │
└──────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Retriever         │
                    │   (similarity       │
                    │    search)          │
                    └──────────┬──────────┘
                               │ top-k chunks
                               ▼
                    ┌──────────────────────┐
                    │   RAG Chain          │
                    │   (LangChain)        │
                    │   Prompt =           │
                    │   context + question │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Claude claude-opus-4-8      │
                    │   (grounded answer)  │
                    └──────────────────────┘
```

---

## Database Setup — pgvector

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Clinical knowledge chunks
CREATE TABLE clinical_knowledge_chunks (
    id              BIGSERIAL PRIMARY KEY,
    source_type     VARCHAR(50) NOT NULL,    -- 'guideline', 'drug_label', 'literature'
    source_id       VARCHAR(200) NOT NULL,   -- 'ADA-2024-diabetes-standards'
    source_title    TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL,
    chunk_text      TEXT NOT NULL,
    metadata        JSONB,                   -- { specialty, year, evidence_level }
    embedding       vector(1536),            -- text-embedding-3-large dimension
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_embedding ON clinical_knowledge_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Patient history chunks (scoped per patient + org)
CREATE TABLE patient_history_chunks (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patient(id),
    org_id          UUID NOT NULL,
    resource_type   VARCHAR(50) NOT NULL,
    resource_id     BIGINT NOT NULL,
    chunk_text      TEXT NOT NULL,           -- human-readable summary of the FHIR resource
    chunk_date      DATE,                    -- date of the clinical event
    embedding       vector(1536),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_history_embedding ON patient_history_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_patient_history_patient ON patient_history_chunks (patient_id, org_id, chunk_date DESC);
```

---

## Embedding Pipeline

### Clinical Knowledge Ingestion

```python
# app/services/rag/knowledge_ingester.py

from openai import AsyncOpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter

class ClinicalKnowledgeIngester:
    CHUNK_SIZE = 800        # tokens
    CHUNK_OVERLAP = 150     # overlap to preserve context across chunks
    EMBEDDING_MODEL = "text-embedding-3-large"
    EMBEDDING_DIMENSION = 1536

    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.CHUNK_SIZE,
            chunk_overlap=self.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ".", " "],
        )

    async def ingest_guideline(self, title: str, content: str, source_id: str, metadata: dict):
        """Chunk a clinical guideline and embed it into the knowledge store."""
        chunks = self.splitter.split_text(content)

        # Batch embed (OpenAI allows up to 2048 texts per request)
        for batch_start in range(0, len(chunks), 100):
            batch = chunks[batch_start:batch_start + 100]
            embeddings = await self._embed_batch(batch)

            async with session_factory() as session:
                for i, (chunk_text, embedding) in enumerate(zip(batch, embeddings)):
                    session.add(ClinicalKnowledgeChunk(
                        source_type="guideline",
                        source_id=source_id,
                        source_title=title,
                        chunk_index=batch_start + i,
                        chunk_text=chunk_text,
                        metadata=metadata,
                        embedding=embedding,
                    ))
                await session.commit()

    async def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await self.openai.embeddings.create(
            model=self.EMBEDDING_MODEL,
            input=texts,
        )
        return [item.embedding for item in response.data]
```

### Patient History Indexing

```python
# app/services/rag/patient_indexer.py

class PatientHistoryIndexer:
    """Converts a patient's FHIR resources to searchable text chunks."""

    RESOURCE_SUMMARIZERS = {
        "Condition": lambda r: f"Condition: {r.get('code', {}).get('text', '')} — status: {r.get('clinicalStatus', {}).get('coding', [{}])[0].get('code', '')} — onset: {r.get('onsetDateTime', 'unknown')}",
        "MedicationRequest": lambda r: f"Medication: {r.get('medicationCodeableConcept', {}).get('text', '')} — {r.get('dosageInstruction', [{}])[0].get('text', '')} — status: {r.get('status', '')}",
        "Observation": lambda r: f"Observation: {r.get('code', {}).get('text', '')} = {r.get('valueQuantity', {}).get('value', '')} {r.get('valueQuantity', {}).get('unit', '')} on {r.get('effectiveDateTime', '')[:10] if r.get('effectiveDateTime') else ''}",
        "Procedure": lambda r: f"Procedure: {r.get('code', {}).get('text', '')} performed {r.get('performedDateTime', '')[:10] if r.get('performedDateTime') else ''}",
        "AllergyIntolerance": lambda r: f"Allergy: {r.get('code', {}).get('text', '')} — severity: {r.get('reaction', [{}])[0].get('severity', 'unknown')}",
        "DiagnosticReport": lambda r: f"DiagnosticReport: {r.get('code', {}).get('text', '')} on {r.get('effectiveDateTime', '')[:10] if r.get('effectiveDateTime') else ''} — conclusion: {r.get('conclusion', '')}",
    }

    async def index_patient(self, patient_id: int, org_id: str):
        """Full re-index of a patient's history. Called on first access and nightly."""
        # Fetch all resources for the patient
        all_resources = await self._fetch_all_patient_resources(patient_id, org_id)

        chunks = []
        for resource in all_resources:
            rtype = resource.get("resourceType")
            summarizer = self.RESOURCE_SUMMARIZERS.get(rtype)
            if not summarizer:
                continue
            chunk_text = summarizer(resource)
            chunks.append({
                "text": chunk_text,
                "resource_type": rtype,
                "date": self._extract_date(resource),
            })

        # Embed all chunks
        texts = [c["text"] for c in chunks]
        embeddings = await self.ingester._embed_batch(texts)

        # Upsert into patient_history_chunks
        async with session_factory() as session:
            # Delete old chunks for this patient
            await session.execute(
                delete(PatientHistoryChunk).where(
                    PatientHistoryChunk.patient_id == patient_id,
                    PatientHistoryChunk.org_id == org_id,
                )
            )
            for chunk, embedding in zip(chunks, embeddings):
                session.add(PatientHistoryChunk(
                    patient_id=patient_id,
                    org_id=org_id,
                    resource_type=chunk["resource_type"],
                    chunk_text=chunk["text"],
                    chunk_date=chunk["date"],
                    embedding=embedding,
                ))
            await session.commit()

    async def index_resource(self, resource: dict, patient_id: int, org_id: str):
        """Incremental index: called whenever a FHIR resource is created or updated."""
        rtype = resource.get("resourceType")
        summarizer = self.RESOURCE_SUMMARIZERS.get(rtype)
        if not summarizer:
            return
        chunk_text = summarizer(resource)
        embedding = (await self.ingester._embed_batch([chunk_text]))[0]

        async with session_factory() as session:
            session.add(PatientHistoryChunk(
                patient_id=patient_id,
                org_id=org_id,
                resource_type=rtype,
                resource_id=resource.get("id"),
                chunk_text=chunk_text,
                chunk_date=self._extract_date(resource),
                embedding=embedding,
            ))
            await session.commit()
```

---

## RAG Retriever

```python
# app/services/rag/retriever.py

class ClinicalRAGRetriever:
    TOP_K_KNOWLEDGE = 5     # chunks from guidelines/drug info
    TOP_K_PATIENT = 8       # chunks from patient history
    SIMILARITY_THRESHOLD = 0.75

    async def retrieve(
        self,
        query: str,
        patient_id: int | None = None,
        org_id: str | None = None,
        knowledge_types: list[str] | None = None,
    ) -> dict:
        """
        Retrieve relevant context for a clinical query.
        Returns a structured context dict ready to inject into a prompt.
        """
        # Embed the query
        query_embedding = (await self.ingester._embed_batch([query]))[0]

        results = {"knowledge": [], "patient_history": []}

        # Search clinical knowledge base
        knowledge_chunks = await self._search_knowledge(
            query_embedding, knowledge_types or ["guideline", "drug_label"], self.TOP_K_KNOWLEDGE
        )
        results["knowledge"] = knowledge_chunks

        # Search patient history (if patient context provided)
        if patient_id and org_id:
            patient_chunks = await self._search_patient_history(
                query_embedding, patient_id, org_id, self.TOP_K_PATIENT
            )
            results["patient_history"] = patient_chunks

        return results

    async def _search_knowledge(self, embedding: list[float], types: list[str], k: int) -> list[dict]:
        async with session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT source_title, chunk_text, metadata,
                           1 - (embedding <=> :embedding) AS similarity
                    FROM clinical_knowledge_chunks
                    WHERE source_type = ANY(:types)
                    AND 1 - (embedding <=> :embedding) > :threshold
                    ORDER BY embedding <=> :embedding
                    LIMIT :k
                """),
                {"embedding": str(embedding), "types": types, "threshold": self.SIMILARITY_THRESHOLD, "k": k},
            )
            return [{"title": r[0], "text": r[1], "metadata": r[2], "similarity": float(r[3])} for r in result]

    async def _search_patient_history(self, embedding: list[float], patient_id: int, org_id: str, k: int) -> list[dict]:
        async with session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT resource_type, chunk_text, chunk_date,
                           1 - (embedding <=> :embedding) AS similarity
                    FROM patient_history_chunks
                    WHERE patient_id = :patient_id AND org_id = :org_id
                    AND 1 - (embedding <=> :embedding) > :threshold
                    ORDER BY embedding <=> :embedding
                    LIMIT :k
                """),
                {"embedding": str(embedding), "patient_id": patient_id, "org_id": org_id, "threshold": self.SIMILARITY_THRESHOLD, "k": k},
            )
            return [{"type": r[0], "text": r[1], "date": str(r[2]) if r[2] else None, "similarity": float(r[3])} for r in result]
```

---

## RAG-Powered AI Endpoint

```python
# app/routers/operations/ai_rag.py

@ai_router.post(
    "/Patient/{patient_id}/$ai-rag",
    operation_id="ai_rag_query",
    summary="AI query with RAG — grounded in guidelines + patient history",
    description="Answers clinical questions using retrieval-augmented generation. Retrieves relevant clinical guidelines and patient history before generating the answer.",
)
async def ai_rag_query(
    patient_id: int,
    body: AIRAGQuerySchema,
    request: Request,
    retriever: ClinicalRAGRetriever = Depends(get_retriever),
    patient: Patient = Depends(resolve_patient),
):
    user = request.state.user

    # Retrieve relevant context
    context = await retriever.retrieve(
        query=body.question,
        patient_id=patient.id,
        org_id=user["activeOrganizationId"],
        knowledge_types=body.knowledge_types or ["guideline", "drug_label"],
    )

    # Build grounded prompt
    knowledge_text = "\n\n".join(
        f"[{c['title']}]\n{c['text']}" for c in context["knowledge"]
    )
    history_text = "\n".join(
        f"- [{c['date'] or 'unknown date'}] {c['text']}" for c in context["patient_history"]
    )

    prompt = f"""You are a clinical decision support AI. Answer based ONLY on the provided context.
If the context doesn't contain enough information, say so — do not speculate.

CLINICAL GUIDELINES RETRIEVED:
{knowledge_text or "No relevant guidelines found."}

PATIENT HISTORY RETRIEVED:
{history_text or "No relevant patient history found."}

QUESTION: {body.question}

Provide a concise, evidence-based answer with citations to the guideline sources."""

    response = await anthropic_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    # Log to AuditEvent
    await audit_service.log_ai_call(
        user_id=user["sub"],
        patient_id=patient.patient_id,
        operation="ai-rag",
        sources_retrieved=len(context["knowledge"]) + len(context["patient_history"]),
    )

    return {
        "answer": response.content[0].text,
        "sources": [{"title": c["title"], "similarity": c["similarity"]} for c in context["knowledge"]],
        "patient_history_used": len(context["patient_history"]),
    }
```

---

## Guideline Ingestion Jobs

```python
# app/tasks/knowledge_jobs.py

@celery.task
async def ingest_ada_guidelines():
    """Fetch and index ADA Standards of Medical Care in Diabetes."""
    async with aiohttp.ClientSession() as session:
        async with session.get("https://api.guidelines.source/ada-2024") as resp:
            content = await resp.text()

    await ingester.ingest_guideline(
        title="ADA Standards of Medical Care in Diabetes 2024",
        content=content,
        source_id="ada-diabetes-2024",
        metadata={"specialty": "endocrinology", "year": 2024, "evidence_level": "A"},
    )

# Celery beat schedule:
# ada_guidelines: every 90 days
# drug_labels: every 30 days
# pubmed_abstracts: every 7 days
# patient_reindex: nightly (incremental only)
```

---

## Hybrid Search (Vector + Keyword)

Pure vector search misses exact matches (drug names, ICD codes). Use hybrid search:

```sql
-- Hybrid search: weighted combination of vector similarity + BM25 text search
SELECT chunk_text, source_title,
       (0.7 * (1 - (embedding <=> :query_embedding)) +
        0.3 * ts_rank(to_tsvector('english', chunk_text), plainto_tsquery('english', :query_text))) AS hybrid_score
FROM clinical_knowledge_chunks
WHERE to_tsvector('english', chunk_text) @@ plainto_tsquery('english', :query_text)
   OR 1 - (embedding <=> :query_embedding) > 0.6
ORDER BY hybrid_score DESC
LIMIT 10;
```

---

## Estimated Effort

| Component | Days |
|---|---|
| pgvector setup + schema | 1 |
| Embedding pipeline (knowledge ingestion) | 2 |
| Patient history indexer | 2 |
| RAG retriever (knowledge + patient history) | 2 |
| `$ai-rag` endpoint | 1 |
| Hybrid search (vector + keyword) | 1 |
| Guideline ingestion jobs (ADA, ACC, USPSTF) | 3 |
| Incremental patient indexing hook | 1 |
| Cache layer (avoid re-embedding) | 1 |
| **Total** | **14 days** |
