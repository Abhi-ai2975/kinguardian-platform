# FileNest v1.0 — Search Architecture

**Version:** 1.0.0
**Status:** Approved for Engineering
**Technology:** OpenSearch 2.x
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Search Architecture Overview](#1-search-architecture-overview)
2. [OpenSearch Cluster Design](#2-opensearch-cluster-design)
3. [Index Design](#3-index-design)
4. [Indexing Pipeline](#4-indexing-pipeline)
5. [Query Architecture](#5-query-architecture)
6. [Search Features](#6-search-features)
7. [Faceted Search](#7-faceted-search)
8. [OCR Content Search](#8-ocr-content-search)
9. [Semantic Search (v2)](#9-semantic-search-v2)
10. [Search Performance](#10-search-performance)
11. [Index Lifecycle Management](#11-index-lifecycle-management)

---

## 1. Search Architecture Overview

```
File Upload
  → Processing Service (OCR extracts text)
  → NATS: file.processed event
  → Search Service subscribes to file.processed
  → Search Service indexes file into OpenSearch

Search Request
  → Client: POST /v1/search
  → Search Service: builds OpenSearch query
  → OpenSearch: executes query, returns results
  → Search Service: enriches results with file metadata
  → Client: paginated results + facets + highlights
```

### 1.1 What Gets Indexed

| Field | Source | Searchable |
|-------|--------|-----------|
| filename | File record | Full-text + keyword |
| mimeType | File record | Keyword filter |
| size | File record | Range filter |
| tags | File record | Keyword filter |
| metadata.* | Custom metadata | Full-text + keyword |
| ocrContent | Processing pipeline | Full-text |
| classification | Processing pipeline | Keyword |
| createdAt | File record | Date range |
| folderId | File record | Keyword filter |
| status | File record | Keyword filter |
| phiDetected | Processing pipeline | Boolean filter |
| virusScanResult | Processing pipeline | Keyword filter |

### 1.2 Index Isolation

Each project has its own OpenSearch index. This provides:
- Complete tenant isolation
- Per-project mapping customization (metadata fields)
- Independent scaling
- Simple deletion (drop the index when project is deleted)

```
Index naming: filenest-{project_id}
Example:      filenest-proj_abc123
```

---

## 2. OpenSearch Cluster Design

### 2.1 Cluster Topology

```
OpenSearch Cluster
├── Master-Eligible Nodes (3) — dedicated master nodes
│   └── Coordinates cluster state, no data stored
├── Data Nodes (3–10, autoscaling)
│   └── Stores shards, handles search and indexing
└── Coordinating Nodes (2–5)
    └── Routes queries, no data stored
    └── Exposed to Search Service

Node types:
  Master: r5.large    (2 vCPU, 16GB RAM)
  Data:   r5.2xlarge  (8 vCPU, 64GB RAM)
  Coord:  c5.xlarge   (4 vCPU, 8GB RAM)
```

### 2.2 Index Settings

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "5s",
    "max_result_window": 10000,
    "analysis": {
      "analyzer": {
        "filename_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "filename_ngram"]
        },
        "metadata_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      },
      "filter": {
        "filename_ngram": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20,
          "token_chars": ["letter", "digit", "punctuation"]
        }
      }
    }
  }
}
```

---

## 3. Index Design

### 3.1 Complete Index Mapping

```json
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "fileId":           { "type": "keyword" },
      "projectId":        { "type": "keyword" },
      "organizationId":   { "type": "keyword" },
      "environmentId":    { "type": "keyword" },
      "folderId":         { "type": "keyword" },
      "filename": {
        "type": "text",
        "analyzer": "filename_analyzer",
        "search_analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword", "ignore_above": 512 },
          "suggest": { "type": "completion" }
        }
      },
      "originalFilename": { "type": "keyword" },
      "mimeType":         { "type": "keyword" },
      "mimeTypeCategory": { "type": "keyword" },
      "size":             { "type": "long" },
      "tags":             { "type": "keyword" },
      "status":           { "type": "keyword" },
      "metadata": {
        "type": "object",
        "dynamic": true,
        "properties": {
          "patientId":    { "type": "keyword" },
          "documentType": { "type": "keyword" },
          "encounterId":  { "type": "keyword" }
        }
      },
      "ocrContent": {
        "type": "text",
        "analyzer": "standard",
        "term_vector": "with_positions_offsets",
        "store": false
      },
      "ocrWordCount":     { "type": "integer" },
      "ocrLanguage":      { "type": "keyword" },
      "classification":   { "type": "keyword" },
      "phiDetected":      { "type": "boolean" },
      "piiDetected":      { "type": "boolean" },
      "virusScanResult":  { "type": "keyword" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib"
        }
      },
      "uploadedBy":       { "type": "keyword" },
      "createdAt":        { "type": "date" },
      "updatedAt":        { "type": "date" },
      "deletedAt":        { "type": "date" },
      "processingCompletedAt": { "type": "date" }
    }
  }
}
```

### 3.2 Dynamic Metadata Mapping

Metadata fields are added dynamically per project. When a new metadata key is indexed, OpenSearch creates the mapping automatically:

```python
async def ensure_metadata_fields_mapped(
    project_id: str,
    metadata: dict,
) -> None:
    """Ensure new metadata fields have appropriate mappings."""
    index_name = f"filenest-{project_id}"
    existing_mapping = await opensearch.indices.get_mapping(index=index_name)
    existing_fields = set(
        existing_mapping[index_name]["mappings"]["properties"]
        .get("metadata", {})
        .get("properties", {})
        .keys()
    )

    new_fields = set(metadata.keys()) - existing_fields
    if not new_fields:
        return

    # Infer field types from values
    field_mappings = {}
    for field in new_fields:
        value = metadata[field]
        if isinstance(value, bool):
            field_mappings[field] = {"type": "boolean"}
        elif isinstance(value, int):
            field_mappings[field] = {"type": "long"}
        elif isinstance(value, float):
            field_mappings[field] = {"type": "double"}
        else:
            field_mappings[field] = {
                "type": "keyword",
                "fields": {
                    "text": {"type": "text", "analyzer": "metadata_analyzer"}
                }
            }

    if field_mappings:
        await opensearch.indices.put_mapping(
            index=index_name,
            body={"properties": {"metadata": {"properties": field_mappings}}},
        )
```

---

## 4. Indexing Pipeline

### 4.1 Document Preparation

```python
class FileIndexDocument(BaseModel):
    fileId: str
    projectId: str
    organizationId: str
    environmentId: str
    folderId: str | None = None
    filename: str
    originalFilename: str
    mimeType: str
    mimeTypeCategory: str        # 'image', 'document', 'video', 'audio', 'other'
    size: int
    tags: list[str] = []
    status: str
    metadata: dict = {}
    ocrContent: str | None = None
    ocrWordCount: int | None = None
    ocrLanguage: str | None = None
    classification: str | None = None
    phiDetected: bool | None = None
    piiDetected: bool | None = None
    virusScanResult: str | None = None
    uploadedBy: str | None = None
    createdAt: str               # ISO 8601
    updatedAt: str
    processingCompletedAt: str | None = None

    @classmethod
    def from_file_and_processing(
        cls,
        file: File,
        processing_results: dict | None,
    ) -> "FileIndexDocument":
        ocr_result = processing_results.get("ocr") if processing_results else None

        return cls(
            fileId=str(file.id),
            projectId=str(file.project_id),
            organizationId=str(file.organization_id),
            environmentId=str(file.environment_id),
            folderId=str(file.folder_id) if file.folder_id else None,
            filename=file.filename,
            originalFilename=file.original_filename,
            mimeType=file.mime_type,
            mimeTypeCategory=get_mime_category(file.mime_type),
            size=file.size,
            tags=list(file.tags or []),
            status=file.status,
            metadata=file.metadata or {},
            ocrContent=ocr_result.get("text") if ocr_result else None,
            ocrWordCount=ocr_result.get("word_count") if ocr_result else None,
            classification=processing_results.get("classification", {}).get("label") if processing_results else None,
            phiDetected=file.phi_detected,
            piiDetected=file.pii_detected,
            virusScanResult=file.virus_scan_result,
            uploadedBy=str(file.uploaded_by or file.uploaded_by_sa or ""),
            createdAt=file.created_at.isoformat(),
            updatedAt=file.updated_at.isoformat(),
        )
```

### 4.2 Indexing Service

```python
class SearchIndexingService:
    def __init__(self, client: AsyncOpenSearch):
        self.client = client

    async def index_file(
        self, file_id: str, project_id: str, db: AsyncSession
    ) -> None:
        file = await db.get(File, file_id)
        if not file or file.deleted_at:
            return

        processing_results = await self._get_processing_results(file_id, db)

        doc = FileIndexDocument.from_file_and_processing(file, processing_results)

        await self.client.index(
            index=f"filenest-{project_id}",
            id=file_id,
            body=doc.model_dump(exclude_none=True),
        )

    async def delete_file(self, file_id: str, project_id: str) -> None:
        await self.client.delete(
            index=f"filenest-{project_id}",
            id=file_id,
            ignore=[404],
        )

    async def update_file_metadata(
        self, file_id: str, project_id: str, updates: dict
    ) -> None:
        await self.client.update(
            index=f"filenest-{project_id}",
            id=file_id,
            body={"doc": updates},
        )

    async def reindex_project(self, project_id: str, db: AsyncSession) -> None:
        """Full reindex for a project (use after schema changes)."""
        await self.client.delete_by_query(
            index=f"filenest-{project_id}",
            body={"query": {"match_all": {}}},
        )

        files = await db.execute(
            select(File).where(
                File.project_id == project_id,
                File.deleted_at.is_(None),
                File.status == "ready",
            )
        )

        for file in files.scalars():
            await self.index_file(file.id, project_id, db)
```

---

## 5. Query Architecture

### 5.1 Query Builder

```python
class SearchQueryBuilder:
    def build(self, query: SearchRequest, project_id: str) -> dict:
        must_clauses = []
        filter_clauses = []
        should_clauses = []

        # Full-text search
        if query.q:
            must_clauses.append({
                "multi_match": {
                    "query": query.q,
                    "fields": [
                        "filename^5",          # Filename matches most important
                        "originalFilename^4",
                        "tags^3",
                        "metadata.*^2",
                        "ocrContent",
                        "classification",
                    ],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                    "prefix_length": 2,
                    "tie_breaker": 0.3,
                }
            })

            # Boost exact filename matches
            should_clauses.append({
                "term": {
                    "filename.keyword": {
                        "value": query.q,
                        "boost": 10,
                    }
                }
            })

        # Status filter (only show non-deleted by default)
        if query.status:
            filter_clauses.append({"terms": {"status": query.status if isinstance(query.status, list) else [query.status]}})
        else:
            filter_clauses.append({
                "bool": {
                    "must_not": [{"term": {"status": "deleted"}}]
                }
            })

        # MIME type filter
        if query.filters and query.filters.mime_type:
            if isinstance(query.filters.mime_type, list):
                filter_clauses.append({"terms": {"mimeType": query.filters.mime_type}})
            else:
                filter_clauses.append({"term": {"mimeType": query.filters.mime_type}})

        # Tag filter
        if query.filters and query.filters.tags:
            filter_clauses.append({"terms": {"tags": query.filters.tags}})

        # Folder filter
        if query.filters and query.filters.folder_id:
            filter_clauses.append({"term": {"folderId": query.filters.folder_id}})

        # Metadata filters
        if query.filters and query.filters.metadata:
            for field, value in query.filters.metadata.items():
                if isinstance(value, list):
                    filter_clauses.append({"terms": {f"metadata.{field}": value}})
                else:
                    filter_clauses.append({"term": {f"metadata.{field}": value}})

        # Date range filter
        if query.filters:
            date_filter = {}
            if query.filters.created_after:
                date_filter["gte"] = query.filters.created_after.isoformat()
            if query.filters.created_before:
                date_filter["lte"] = query.filters.created_before.isoformat()
            if date_filter:
                filter_clauses.append({"range": {"createdAt": date_filter}})

        # Size range filter
        if query.filters and (query.filters.size_gte or query.filters.size_lte):
            size_filter = {}
            if query.filters.size_gte:
                size_filter["gte"] = query.filters.size_gte
            if query.filters.size_lte:
                size_filter["lte"] = query.filters.size_lte
            filter_clauses.append({"range": {"size": size_filter}})

        # PHI filter (admin only, healthcare projects)
        if query.filters and query.filters.phi_detected is not None:
            filter_clauses.append({"term": {"phiDetected": query.filters.phi_detected}})

        query_body = {
            "query": {
                "bool": {
                    "must": must_clauses or [{"match_all": {}}],
                    "filter": filter_clauses,
                    "should": should_clauses,
                    "minimum_should_match": 0,
                }
            },
            "from": 0,  # Using search_after for deep pagination
            "size": min(query.limit or 20, 100),
            "sort": self._build_sort(query.sort_by, query.sort_order, query.q),
        }

        # Highlighting
        if query.highlight and query.q:
            query_body["highlight"] = {
                "fields": {
                    "ocrContent": {
                        "fragment_size": 200,
                        "number_of_fragments": 3,
                        "pre_tags": ["<em>"],
                        "post_tags": ["</em>"],
                    },
                    "filename": {
                        "number_of_fragments": 0,
                    },
                    "metadata.*": {
                        "number_of_fragments": 1,
                    },
                },
                "require_field_match": False,
            }

        # Aggregations for facets
        if query.facets:
            query_body["aggs"] = self._build_aggregations(query.facets)

        return query_body

    def _build_sort(
        self, sort_by: str | None, sort_order: str, has_query: bool
    ) -> list:
        if not sort_by or sort_by == "relevance":
            if has_query:
                return [{"_score": {"order": "desc"}}, {"createdAt": {"order": "desc"}}]
            else:
                return [{"createdAt": {"order": "desc"}}]

        field_map = {
            "created_at": "createdAt",
            "updated_at": "updatedAt",
            "filename": "filename.keyword",
            "size": "size",
        }
        mapped_field = field_map.get(sort_by, sort_by)
        return [{mapped_field: {"order": sort_order or "desc"}}]
```

---

## 6. Search Features

### 6.1 Autocomplete / Suggestions

```python
@router.get("/v1/search/suggest")
async def search_suggestions(
    q: str,
    limit: int = 5,
    auth: AuthContext = Depends(require_scope("search")),
):
    response = await opensearch.search(
        index=f"filenest-{auth.project_id}",
        body={
            "suggest": {
                "filename_suggest": {
                    "prefix": q,
                    "completion": {
                        "field": "filename.suggest",
                        "size": limit,
                        "skip_duplicates": True,
                    }
                }
            },
            "size": 0,
        }
    )

    suggestions = [
        option["text"]
        for option in response["suggest"]["filename_suggest"][0]["options"]
    ]
    return {"suggestions": suggestions}
```

### 6.2 Saved Searches

```python
class SavedSearchService:
    async def save(
        self, name: str, query: SearchRequest, auth: AuthContext
    ) -> SavedSearch:
        saved = SavedSearch(
            organization_id=auth.organization_id,
            project_id=auth.project_id,
            name=name,
            query=query.model_dump(),
            created_by=auth.actor_id,
        )
        self.db.add(saved)
        return saved

    async def run(
        self, saved_search_id: str, auth: AuthContext
    ) -> SearchResults:
        saved = await self.db.get(SavedSearch, saved_search_id)
        query = SearchRequest.model_validate(saved.query)
        return await self.search_service.query(query, auth)
```

---

## 7. Faceted Search

### 7.1 Aggregation Builder

```python
def _build_aggregations(self, facets: list[str]) -> dict:
    aggs = {}

    for facet in facets:
        field_map = {
            "documentType":  "metadata.documentType",
            "tags":          "tags",
            "mimeType":      "mimeType",
            "mimeTypeCategory": "mimeTypeCategory",
            "status":        "status",
            "classification": "classification",
            "phiDetected":   "phiDetected",
        }

        os_field = field_map.get(facet, f"metadata.{facet}")

        aggs[facet] = {
            "terms": {
                "field": os_field,
                "size": 20,
                "min_doc_count": 1,
                "order": {"_count": "desc"},
            }
        }

    # Always add total size aggregation
    aggs["totalSize"] = {"sum": {"field": "size"}}

    # Date histogram for timeline
    aggs["uploadTimeline"] = {
        "date_histogram": {
            "field": "createdAt",
            "calendar_interval": "month",
            "format": "yyyy-MM",
        }
    }

    return aggs
```

### 7.2 Facet Response Parsing

```python
def parse_facets(self, aggs: dict) -> dict:
    facets = {}

    for facet_name, agg_result in aggs.items():
        if facet_name in ("totalSize", "uploadTimeline"):
            continue

        if "buckets" in agg_result:
            facets[facet_name] = [
                {"value": bucket["key"], "count": bucket["doc_count"]}
                for bucket in agg_result["buckets"]
            ]

    # Add computed facets
    if "totalSize" in aggs:
        facets["_totalSize"] = aggs["totalSize"]["value"]

    if "uploadTimeline" in aggs:
        facets["_uploadTimeline"] = [
            {"month": b["key_as_string"], "count": b["doc_count"]}
            for b in aggs["uploadTimeline"]["buckets"]
        ]

    return facets
```

---

## 8. OCR Content Search

### 8.1 OCR Text Storage

OCR-extracted text is stored in the OpenSearch index as `ocrContent`. The original PDF/image file is in storage; the index stores only the extracted text.

Text storage decisions:
- OCR text stored in OpenSearch only (not PostgreSQL) — optimized for search
- Long documents chunked into 32KB segments (OpenSearch field limit)
- Confidence threshold: only index text with Tesseract confidence > 60%

```python
async def store_ocr_content(
    file_id: str,
    project_id: str,
    ocr_result: OCRResult,
) -> None:
    # Truncate if too long (rare — most PDFs < 1MB text)
    text = ocr_result.text
    if len(text) > 1_000_000:  # 1MB max
        text = text[:1_000_000] + "...[truncated]"

    await opensearch.update(
        index=f"filenest-{project_id}",
        id=file_id,
        body={
            "doc": {
                "ocrContent": text,
                "ocrWordCount": len(text.split()),
                "ocrLanguage": ocr_result.language,
            }
        },
    )
```

### 8.2 OCR Search with Highlight

Search response includes highlighted OCR snippets showing where the query term appears in the document:

```json
{
  "id": "file_abc123",
  "filename": "discharge-summary.pdf",
  "highlights": {
    "ocrContent": [
      "...Patient was admitted with <em>chest pain</em> and shortness of breath...",
      "...Discharged with diagnosis of <em>chest pain</em>, etiology unclear..."
    ],
    "filename": ["<em>discharge</em>-summary.pdf"]
  }
}
```

---

## 9. Semantic Search (v2)

### 9.1 Embedding Architecture (Planned)

The `embedding` field in the index mapping is reserved for v2 semantic search:

```python
# v2: Generate embeddings during processing
class EmbeddingStage(PipelineStage):
    def __init__(self, model_name: str = "text-embedding-3-small"):
        self.client = openai.AsyncOpenAI()
        self.model_name = model_name

    async def execute(self, event: FileUploadedEvent) -> dict:
        ocr_text = await self.ocr_repo.get_text(event.payload.file_id)
        if not ocr_text or len(ocr_text) < 100:
            return {"skipped": True, "reason": "insufficient_text"}

        # Chunk text for long documents
        chunks = self._chunk_text(ocr_text, max_tokens=8000)

        # Generate embedding for first chunk (or full text if short)
        embedding_text = chunks[0] if chunks else ocr_text
        response = await self.client.embeddings.create(
            input=embedding_text,
            model=self.model_name,
        )
        embedding = response.data[0].embedding

        # Store in OpenSearch
        await self.indexer.update_embedding(
            file_id=event.payload.file_id,
            project_id=event.project_id,
            embedding=embedding,
        )

        return {"model": self.model_name, "dimensions": len(embedding)}
```

---

## 10. Search Performance

### 10.1 Caching Strategy

```python
class CachedSearchService:
    CACHE_TTL = 30  # seconds

    async def query(
        self, request: SearchRequest, auth: AuthContext
    ) -> SearchResults:
        # Only cache simple queries (no cursor pagination, < 30 seconds old data ok)
        if request.cursor or not request.enable_cache:
            return await self._execute_query(request, auth)

        cache_key = f"search:{auth.project_id}:{hashlib.sha256(request.model_dump_json().encode()).hexdigest()}"
        cached = await redis.get(cache_key)
        if cached:
            return SearchResults.model_validate_json(cached)

        results = await self._execute_query(request, auth)
        await redis.setex(cache_key, self.CACHE_TTL, results.model_dump_json())
        return results
```

### 10.2 Search Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| p50 query latency | < 50ms | — |
| p95 query latency | < 200ms | 500ms |
| p99 query latency | < 500ms | 1000ms |
| Indexing latency | < 5s after file.processed | 30s |
| Index throughput | 1,000 docs/sec | — |
| Max index size | 100GB per project | Alert at 80GB |

---

## 11. Index Lifecycle Management

### 11.1 Index Creation

Indexes are created when a project is created:

```python
async def create_project_index(project_id: str, config: SearchConfig) -> None:
    index_name = f"filenest-{project_id}"
    await opensearch.indices.create(
        index=index_name,
        body={
            "settings": get_index_settings(config),
            "mappings": get_index_mappings(),
        },
    )
```

### 11.2 Index Deletion

When a project is deleted, its search index is deleted:

```python
async def delete_project_index(project_id: str) -> None:
    await opensearch.indices.delete(
        index=f"filenest-{project_id}",
        ignore=[404],
    )
```

### 11.3 Index Backup

OpenSearch snapshots are taken daily to S3:

```python
async def create_snapshot(project_ids: list[str]) -> None:
    await opensearch.snapshot.create(
        repository="s3-backup",
        snapshot=f"backup-{datetime.utcnow().strftime('%Y%m%d')}",
        body={
            "indices": [f"filenest-{pid}" for pid in project_ids],
            "include_global_state": False,
        },
        wait_for_completion=False,
    )
```
