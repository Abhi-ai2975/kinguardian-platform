/**
 * ProcessingPage — deep-dive on FileNest processing pipeline capabilities.
 *
 * Covers virus scanning, MIME validation, OCR, PHI detection, previews,
 * thumbnails, AI embedding, and semantic search preparation.
 *
 * @module
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ScanLine, ScanText, Brain, ImagePlus, Zap } from "lucide-react";

const PIPELINE_STAGES = [
  {
    icon: ShieldCheck,
    title: "Virus Scan",
    tag: "Always first",
    body: "ClamAV-powered antivirus scan runs synchronously before any other stage. Detected files are quarantined immediately — the file record is created but download is blocked. A NATS event is fired so your webhook can notify admins.",
  },
  {
    icon: ScanLine,
    title: "MIME Validation",
    tag: "Always second",
    body: "Content-based MIME detection (libmagic) runs in parallel with virus scanning. Blocks files whose actual type doesn't match the declared Content-Type — stops extension spoofing at the upload boundary.",
  },
  {
    icon: ScanText,
    title: "OCR",
    tag: "Configurable",
    body: "Tesseract-based OCR extracts text from images and scanned PDFs. Extracted text is stored as file metadata and sent to the OpenSearch indexer so uploaded documents become full-text searchable without client-side preprocessing.",
  },
  {
    icon: ShieldCheck,
    title: "PHI / PII Detection",
    tag: "Configurable",
    body: "Pattern-based and ML-based scanning flags protected health information and PII before a file's download URL is issued. On detection the file can be quarantined, redacted, or forwarded to a review queue — all via project config.",
  },
  {
    icon: ImagePlus,
    title: "Thumbnails & Previews",
    tag: "Configurable",
    body: "Generates responsive image thumbnails (WebP, configurable sizes) and PDF page previews. Results are stored in the same object storage bucket and referenced in the file metadata. The `<FilePreview>` React component picks them up automatically.",
  },
  {
    icon: Brain,
    title: "AI Embedding",
    tag: "Phase 7",
    body: "Sentence-transformer or OpenAI embeddings are generated per document chunk and stored in pgvector. Powers semantic search: 'find documents similar to this one' or 'find all documents mentioning adverse reactions' without exact-keyword matches.",
  },
] as const;

const CODE = `# Enable stages per project via config
project_config = {
  "processing": {
    "stages": [
      "virus_scan",       # always runs
      "mime_validation",  # always runs
      "ocr",
      "phi_detection",
      "thumbnail"
    ],
    "thumbnail_sizes": [128, 512],
    "ocr_languages": ["eng"],
    "phi_action": "quarantine"  # or "redact" | "flag"
  }
}`;

export function ProcessingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="text-center mb-14">
        <Badge className="mb-4">Processing</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Every upload runs through a pipeline
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          FileNest scans, validates, and enriches every file after upload. Processing is
          asynchronous and non-blocking — files are available for download before all stages finish.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 mb-14">
        {PIPELINE_STAGES.map(({ icon: Icon, title, tag, body }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">{tag}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/40 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Configuration — per project, no code changes</p>
        </div>
        <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre leading-relaxed">
          {CODE}
        </pre>
      </div>
    </div>
  );
}
