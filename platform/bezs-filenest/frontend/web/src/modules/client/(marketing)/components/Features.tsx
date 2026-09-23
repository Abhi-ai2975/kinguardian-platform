/**
 * Features — 8-card feature grid for the landing page.
 *
 * Each card maps to a major FileNest capability from the product spec.
 *
 * @module
 */
import {
  Upload, Cpu, Search, ShieldCheck, Webhook, Code2,
  Building2, Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Upload,
    title: "Multi-provider Upload",
    description:
      "Drag-and-drop, multipart, and resumable uploads to S3, R2, Azure Blob, GCS, MinIO, or your own storage — same API everywhere.",
  },
  {
    icon: Cpu,
    title: "Processing Pipelines",
    description:
      "Configurable pipelines run virus scanning, MIME validation, OCR, PHI detection, thumbnail generation, and AI embeddings automatically after upload.",
  },
  {
    icon: Search,
    title: "Full-text Search",
    description:
      "OpenSearch-backed search across filenames, custom metadata, tags, and OCR-extracted text. Faceted filters and relevance ranking out of the box.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & Governance",
    description:
      "WORM immutability, legal hold, configurable retention policies, GDPR right-to-erasure, and 7-year audit logs with tamper-evident storage.",
  },
  {
    icon: Webhook,
    title: "Event Webhooks",
    description:
      "Every file state change emits a signed webhook. Configurable endpoints, automatic retries with exponential back-off, and delivery logs.",
  },
  {
    icon: Code2,
    title: "SDKs for Every Stack",
    description:
      "First-class SDKs for Node.js, Python, and React. @filenest/react ships drop-in upload and file browser components — wire up in minutes.",
  },
  {
    icon: Building2,
    title: "True Multi-tenancy",
    description:
      "Organizations → Projects → Files. Row-level tenant isolation, team RBAC, API key scoping, and per-project storage configuration.",
  },
  {
    icon: Lock,
    title: "Security by Default",
    description:
      "Short-lived upload tokens for browsers, scoped API keys with prefixes, encrypted secrets at rest, and a full audit trail on every mutation.",
  },
] as const;

export function Features() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything a file API needs to be
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop re-building file management for every product. FileNest gives you the infrastructure
            layer in one API call.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="group border hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
