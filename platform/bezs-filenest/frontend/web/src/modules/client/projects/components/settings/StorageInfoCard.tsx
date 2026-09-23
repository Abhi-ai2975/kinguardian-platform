/**
 * StorageInfoCard — read-only storage details with a Test Connection button.
 *
 * Renders for both managed and BYOB modes. Shows non-sensitive fields from
 * StorageConfigResponse (credentials are never returned by the API).
 * The verify button calls the parent's onVerify handler which runs the
 * POST /storage/verify probe and updates status + last_verified_at.
 *
 * Encryption row behaviour:
 *   Azure / GCS           — "Azure-managed" / "Google-managed" (always on)
 *   S3 / R2               — "AES-256" or "AWS KMS" (always enabled)
 *   MinIO / RustFS        — shown only when sse_enabled=true ("AES-256 (server-managed)")
 *
 * @module
 */
"use client";

import { CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProviderFamily } from "@/modules/entities/schemas/storage-config";
import type { TStorageConfig } from "@/modules/entities/schemas/storage-config";

interface StorageInfoCardProps {
  config: TStorageConfig;
  onVerify: () => void;
  isVerifying: boolean;
}

export const STATUS_META = {
  active: {
    icon: CheckCircle2,
    label: "Active",
    className: "text-green-600",
  },
  pending_verification: {
    icon: Clock,
    label: "Pending verification",
    className: "text-yellow-600",
  },
  verification_failed: {
    icon: AlertCircle,
    label: "Verification failed",
    className: "text-destructive",
  },
} as const;

export const PROVIDER_LABELS: Record<TStorageConfig["provider"], string> = {
  s3: "Amazon S3",
  azure_blob: "Azure Blob Storage",
  gcs: "Google Cloud Storage",
  minio: "MinIO",
  r2: "Cloudflare R2",
  rustfs: "RustFS",
};

const MODE_LABELS: Record<TStorageConfig["storage_mode"], string> = {
  managed: "Managed by FileNest",
  byob: "Bring your own bucket",
};

const S3_SSE_LABELS: Record<string, string> = {
  AES256: "AES-256",
  "aws:kms": "AWS KMS",
};

function encryptionLabel(config: TStorageConfig): string | null {
  const family = getProviderFamily(config.provider);
  if (family === "azure_blob") return "Azure-managed (always on)";
  if (family === "gcs") return "Google-managed (always on)";
  // S3 family: hide row when SSE is disabled (MinIO/RustFS only scenario)
  if (!config.sse_enabled) return null;
  if (config.server_side_encryption === "aws:kms") return "AWS KMS";
  return "AES-256";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-all">{value}</span>
    </div>
  );
}

export function StorageInfoCard({ config, onVerify, isVerifying }: StorageInfoCardProps) {
  const meta = STATUS_META[config.status];
  const StatusIcon = meta.icon;
  const encryption = encryptionLabel(config);

  return (
    <div className="rounded-lg border">
      {/* Status bar + verify button */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className={cn("flex items-center gap-2 text-sm font-medium", meta.className)}>
          <StatusIcon className="h-4 w-4 shrink-0" />
          <span>{meta.label}</span>
          {config.last_verified_at && (
            <span className="text-xs font-normal text-muted-foreground hidden sm:inline">
              · verified {new Date(config.last_verified_at).toLocaleString()}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onVerify} disabled={isVerifying}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isVerifying && "animate-spin")} />
          {isVerifying ? "Testing…" : "Test connection"}
        </Button>
      </div>

      {/* Detail rows */}
      <div className="px-4">
        <Row label="Mode" value={MODE_LABELS[config.storage_mode]} />
        <Row label="Provider" value={PROVIDER_LABELS[config.provider]} />
        <Row label="Environment" value={config.environment} />
        {config.bucket_name && (
          <Row
            label={config.provider === "azure_blob" ? "Container" : "Bucket"}
            value={config.bucket_name}
          />
        )}
        {config.region && <Row label="Region" value={config.region} />}
        {config.endpoint_url && <Row label="Endpoint" value={config.endpoint_url} />}
        {encryption && <Row label="Encryption" value={encryption} />}
        <Row
          label="Last verified"
          value={
            config.last_verified_at
              ? new Date(config.last_verified_at).toLocaleString()
              : "Never"
          }
        />
      </div>
    </div>
  );
}
