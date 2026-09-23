/**
 * StoragePage — deep-dive on FileNest storage abstraction.
 *
 * Covers multi-cloud provider support, BYOB (bring your own bucket),
 * the provider resolver, and storage configuration per project.
 *
 * @module
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Settings, Globe, Lock, Layers, RefreshCw } from "lucide-react";

const PROVIDERS = [
  { name: "Amazon S3", phase: "Phase 1", detail: "AWS S3 + S3-compatible endpoints. Presigned PUT for direct upload. Multipart upload for files > 100 MB. Server-side encryption (SSE-S3 or SSE-KMS). Lifecycle rules for intelligent tiering." },
  { name: "Cloudflare R2", phase: "Phase 7", detail: "Zero egress cost. S3-compatible API. Ideal for high-download workloads like media delivery. R2 public buckets available for CDN-backed asset delivery." },
  { name: "Azure Blob Storage", phase: "Phase 7", detail: "Azure AD integration, SAS token generation, tiered storage (Hot / Cool / Archive). Suitable for enterprise tenants already on Azure." },
  { name: "Google Cloud Storage", phase: "Phase 7", detail: "GCS signed URL generation. Uniform bucket-level access enforced. Works with Cloud CDN for global asset delivery." },
  { name: "MinIO", phase: "Phase 1", detail: "S3-compatible self-hosted object storage. Used in the local dev stack (Docker). Lets teams develop without cloud credentials." },
] as const;

const FEATURES = [
  {
    icon: Cloud,
    title: "Provider abstraction",
    body: "All storage operations go through the `StorageProvider` protocol. Service code never imports S3Client, BlobServiceClient, or any provider SDK directly — only the injected provider interface.",
  },
  {
    icon: Settings,
    title: "Per-project configuration",
    body: "Each project stores its storage provider, bucket/container name, region, and credentials in the FileNest database. Switching a project to a different bucket is a config change, not a code change.",
  },
  {
    icon: Globe,
    title: "Bring your own bucket",
    body: "Enterprise tenants can supply credentials to their own S3 bucket, Azure container, or GCS bucket. FileNest manages the presigned URL lifecycle without ever touching the storage provider credentials client-side.",
  },
  {
    icon: Layers,
    title: "Multipart upload",
    body: "Files larger than 100 MB automatically switch to multipart upload. FileNest coordinates part URL generation, parallel part upload, and final assembly — the SDK handles retry logic per part.",
  },
  {
    icon: Lock,
    title: "Encryption at rest",
    body: "SSE-S3 by default. Projects with HIPAA controls enabled enforce SSE-KMS with a customer-managed key. The encryption mode is validated when a project's compliance configuration is saved.",
  },
  {
    icon: RefreshCw,
    title: "Storage migration",
    body: "Files can be moved between storage providers server-side via a COPY+DELETE operation coordinated by FileNest. The file record's storage key is updated atomically — client applications see no downtime.",
  },
] as const;

export function StoragePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="text-center mb-14">
        <Badge className="mb-4">Storage</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Any cloud, any bucket, one API
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          FileNest abstracts over S3, R2, Azure Blob, GCS, and MinIO behind a single interface.
          Switch providers per project — or bring your own bucket — without touching your
          application code.
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

      <h2 className="text-xl font-semibold mb-4">Supported providers</h2>
      <div className="divide-y rounded-xl border overflow-hidden">
        {PROVIDERS.map(({ name, phase, detail }) => (
          <div key={name} className="flex items-start gap-4 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{name}</span>
                <Badge variant="outline" className="text-xs">{phase}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
