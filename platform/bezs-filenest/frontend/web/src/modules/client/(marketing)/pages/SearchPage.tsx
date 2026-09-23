/**
 * SearchPage — deep-dive on FileNest search architecture.
 *
 * Covers keyword search, faceted filtering, semantic/vector search,
 * OCR-powered document search, and OpenSearch integration details.
 *
 * @module
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Tags, FileSearch, Layers, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Full-text search",
    body: "OpenSearch 2.x powers BM25 full-text search across file names, custom metadata fields, and OCR-extracted text. Queries support wildcards, fuzzy matching, phrase queries, and field boosting — all via a single `q` parameter.",
  },
  {
    icon: Filter,
    title: "Faceted filtering",
    body: "Narrow results by metadata fields, tags, MIME type, date range, processing status, or legal-hold state. Facets are declared per project so end users see only the filters relevant to their document type.",
  },
  {
    icon: Tags,
    title: "Tag-based retrieval",
    body: "Tags are first-class indexed fields. A single document can carry unlimited tags. Tag aggregations let you build 'grouped by tag' views without additional API calls.",
  },
  {
    icon: FileSearch,
    title: "OCR document search",
    body: "The OCR processing stage sends extracted text to the OpenSearch indexer after upload. Scanned PDFs and images are immediately searchable without any client-side OCR or text extraction — FileNest does it in the pipeline.",
  },
  {
    icon: Layers,
    title: "Semantic search (Phase 7)",
    body: "Vector embeddings stored in pgvector enable similarity search: 'files like this one' or natural-language queries across document content. Embeddings are generated in the AI Embedding processing stage and synced to the vector index.",
  },
  {
    icon: Zap,
    title: "Real-time indexing",
    body: "Files are indexed by the NATS `file.uploaded` and `file.processed` events — no polling required. Index updates propagate within seconds of upload completion. Deletions and metadata updates trigger incremental re-index.",
  },
] as const;

const CODE = `// Search from the browser — zero config
import { useSearch } from '@filenest/react';

function DocSearch() {
  const { results, facets, totalCount, search } = useSearch({
    debounceMs: 300,
    facets: ['documentType', 'tags'],
  });

  return (
    <>
      <input onChange={e => search({ q: e.target.value })} placeholder="Search…" />
      <p>{totalCount} results</p>
      {results.map(f => <div key={f.id}>{f.filename}</div>)}
    </>
  );
}`;

export function SearchPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="text-center mb-14">
        <Badge className="mb-4">Search</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find anything, instantly
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          OpenSearch-backed full-text search with metadata facets, tag filtering, and
          OCR-powered document search — available out of the box with no search infrastructure
          to manage.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 mb-14">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/40 p-6">
        <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre leading-relaxed">
          {CODE}
        </pre>
      </div>
    </div>
  );
}
