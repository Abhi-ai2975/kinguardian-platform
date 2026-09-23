/**
 * StorageEncryptionForm — server-side encryption toggle for a project's storage.
 *
 * Shown on the Storage settings tab for all projects. For MinIO and RustFS,
 * renders a toggle the user can flip. For all other providers (S3, R2, Azure,
 * GCS) encryption is always on — a read-only badge is shown instead.
 *
 * When enabled for MinIO/RustFS, FileNest sends ServerSideEncryption: AES256
 * on every PUT. The MinIO/RustFS server must have a KMS key configured
 * (MINIO_KMS_SECRET_KEY / RUSTFS_KMS_SECRET_KEY) for encryption to take effect.
 *
 * @module
 */
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Lock, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { updateSseAction } from "@/modules/server/presentation/actions/storage-config.actions";
import {
  SseFormSchema,
  getProviderFamily,
  type TSseForm,
  type TStorageConfig,
} from "@/modules/entities/schemas/storage-config";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

interface Props {
  projectId: string;
  config: TStorageConfig;
}

export function StorageEncryptionForm({ projectId, config }: Props) {
  const family = getProviderFamily(config.provider);
  const isToggleable = config.provider === "minio" || config.provider === "rustfs";

  const form = useForm<TSseForm>({
    resolver: zodResolver(SseFormSchema),
    defaultValues: { sse_enabled: config.sse_enabled },
  });

  const { execute: save, isPending } = useServerAction(updateSseAction, {
    onSuccess: () => toast.success("Encryption setting saved"),
    onError: ({ err }) =>
      handleZSAError({ err, fallbackMessage: "Failed to update encryption setting" }),
  });

  async function onSubmit(values: TSseForm) {
    await save({
      payload: { projectId, sse_enabled: values.sse_enabled },
      transportOptions: {
        shouldRevalidate: true,
        url: `/projects/${projectId}/settings/storage`,
      },
    });
  }

  const alwaysOnLabel =
    family === "azure_blob"
      ? "Azure-managed encryption (always on)"
      : family === "gcs"
        ? "Google-managed encryption (always on)"
        : "AES-256 (always on)";

  return (
    <div>
      <h3 className="text-sm font-medium mb-1">Encryption at rest</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {isToggleable
          ? "Encrypt all files stored in this project. Requires the KMS key to be configured on your MinIO/RustFS server."
          : "Encryption is enforced by the storage provider and cannot be disabled."}
      </p>

      {isToggleable ? (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="sse_enabled"
            control={form.control}
            render={({ field }) => (
              <Field>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FieldLabel className="text-sm font-medium leading-none">
                      Server-side encryption (SSE-S3)
                    </FieldLabel>
                    <FieldDescription className="text-xs">
                      FileNest sends{" "}
                      <code className="text-xs">ServerSideEncryption: AES256</code>{" "}
                      on every upload. Your {config.provider === "minio" ? "MinIO" : "RustFS"} server
                      must have a KMS key configured.
                    </FieldDescription>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Enable server-side encryption"
                  />
                </div>
              </Field>
            )}
          />

          <Button
            type="submit"
            disabled={isPending || !form.formState.isDirty}
            size="sm"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border p-4">
          <Lock className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-sm">{alwaysOnLabel}</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            Enforced
          </Badge>
        </div>
      )}
    </div>
  );
}
