/**
 * StorageConfigForm — storage configuration for a project.
 *
 * Renders two modes:
 *   managed — StorageInfoCard only (details + test button; no credentials to enter)
 *   byob    — StorageInfoCard (current status + details) + provider-specific credential form
 *
 * Credential fields vary by provider family:
 *   S3 / MinIO / RustFS / R2  →  access_key_id + secret_access_key (+ SSE options)
 *   Azure Blob                →  account_name + account_key
 *   GCS                       →  credentials_json textarea (full service account JSON)
 *
 * Credentials are never returned by the API after save (stored encrypted), so
 * all credential fields are always empty on load.
 *
 * @module
 */
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  updateStorageConfigAction,
  verifyStorageAction,
} from "@/modules/server/presentation/actions/storage-config.actions";
import {
  StorageConfigFormSchema,
  PROVIDERS_REQUIRING_ENDPOINT,
  getProviderFamily,
  type TStorageConfigForm,
  type TStorageConfig,
} from "@/modules/entities/schemas/storage-config";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";
import { StorageInfoCard } from "@/modules/client/projects/components/settings/StorageInfoCard";

interface StorageConfigFormProps {
  projectId: string;
  config: TStorageConfig;
}

export function StorageConfigForm({ projectId, config }: StorageConfigFormProps) {
  const provider = config.provider;
  const family = getProviderFamily(provider);
  const needsEndpoint = (PROVIDERS_REQUIRING_ENDPOINT as readonly string[]).includes(provider);

  const form = useForm<TStorageConfigForm>({
    resolver: zodResolver(StorageConfigFormSchema),
    defaultValues: {
      provider,
      bucket_name: config.bucket_name ?? "",
      region: config.region ?? "",
      endpoint_url: config.endpoint_url ?? "",
      // S3-family
      access_key_id: "",
      secret_access_key: "",
      server_side_encryption:
        (config.server_side_encryption as "AES256" | "aws:kms") ?? "AES256",
      kms_key_id: "",
      // Azure
      account_name: "",
      account_key: "",
      // GCS
      credentials_json: "",
    },
  });

  const sse = form.watch("server_side_encryption");

  const { execute: save, isPending: isSaving } = useServerAction(
    updateStorageConfigAction,
    {
      onSuccess: () =>
        toast.success("Credentials saved — click Test connection to activate"),
      onError: ({ err }) =>
        handleZSAError({ err, form, fallbackMessage: "Failed to save storage config" }),
    },
  );

  const { execute: verify, isPending: isVerifying } = useServerAction(
    verifyStorageAction,
    {
      onSuccess: ({ data }) => {
        if (data?.ok) {
          toast.success(`Connection verified — latency ${data.latency_ms?.toFixed(0) ?? "?"}ms`);
        } else {
          toast.error(`Verification failed: ${data?.error ?? "Unknown error"}`);
        }
      },
      onError: ({ err }) =>
        handleZSAError({ err, fallbackMessage: "Verification request failed" }),
    },
  );

  async function onSubmit(values: TStorageConfigForm) {
    const { provider: _p, ...rest } = values;
    await save({
      payload: { projectId, ...rest },
      transportOptions: {
        shouldRevalidate: true,
        url: `/projects/${projectId}/settings/storage`,
      },
    });
  }

  async function onVerify() {
    await verify({
      payload: { projectId },
      transportOptions: {
        shouldRevalidate: true,
        url: `/projects/${projectId}/settings/storage`,
      },
    });
  }

  if (config.storage_mode === "managed") {
    return (
      <StorageInfoCard config={config} onVerify={onVerify} isVerifying={isVerifying} />
    );
  }

  return (
    <div className="space-y-6">
      <StorageInfoCard config={config} onVerify={onVerify} isVerifying={isVerifying} />

      <div>
        <h3 className="text-sm font-medium mb-1">Credentials</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Stored encrypted — never returned by the API after save.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FieldGroup>
            {/* ── Universal: bucket / container name ────────────────────── */}
            <Controller
              name="bucket_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {provider === "azure_blob" ? "Container name" : "Bucket name"}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder={provider === "azure_blob" ? "my-container" : "my-bucket"}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* ── S3 family: endpoint URL (MinIO / RustFS / R2) ─────────── */}
            {family === "s3_family" && needsEndpoint && (
              <Controller
                name="endpoint_url"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Endpoint URL</FieldLabel>
                    <FieldDescription>Required for this provider</FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder={
                        provider === "r2"
                          ? "https://<account_id>.r2.cloudflarestorage.com"
                          : "http://localhost:9000"
                      }
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}

            {/* ── S3 / GCS: region ──────────────────────────────────────── */}
            {(family === "s3_family" && !needsEndpoint) || family === "gcs" ? (
              <Controller
                name="region"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Region</FieldLabel>
                    {family === "gcs" && (
                      <FieldDescription>Optional — determined by bucket location</FieldDescription>
                    )}
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="us-east-1"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ) : null}

            {/* ── S3 family credentials ─────────────────────────────────── */}
            {family === "s3_family" && (
              <>
                <Controller
                  name="access_key_id"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Access key ID</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="secret_access_key"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Secret access key</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="password"
                        placeholder="••••••••••••••••••••••••••••••••"
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* SSE only for AWS S3 (not MinIO / RustFS / R2) */}
                {provider === "s3" && (
                  <Controller
                    name="server_side_encryption"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Server-side encryption</FieldLabel>
                        <NativeSelect
                          id={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <NativeSelectOption value="AES256">AES-256 (default)</NativeSelectOption>
                          <NativeSelectOption value="aws:kms">AWS KMS</NativeSelectOption>
                        </NativeSelect>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                )}

                {provider === "s3" && sse === "aws:kms" && (
                  <Controller
                    name="kms_key_id"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>KMS key ARN</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          placeholder="arn:aws:kms:us-east-1:123456789:key/…"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                )}
              </>
            )}

            {/* ── Azure Blob credentials ────────────────────────────────── */}
            {family === "azure_blob" && (
              <>
                <Controller
                  name="account_name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Storage account name</FieldLabel>
                      <FieldDescription>
                        Found in Azure Portal → Storage account → Settings → Access keys
                      </FieldDescription>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="mystorageaccount"
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="account_key"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Storage access key</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="password"
                        placeholder="••••••••••••••••••••••••••••••••"
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </>
            )}

            {/* ── GCS credentials ───────────────────────────────────────── */}
            {family === "gcs" && (
              <Controller
                name="credentials_json"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Service account JSON</FieldLabel>
                    <FieldDescription>
                      Paste the full contents of your GCP service account key JSON file.
                      Generate one in GCP Console → IAM → Service accounts → Keys.
                    </FieldDescription>
                    <Textarea
                      {...field}
                      id={field.name}
                      rows={8}
                      placeholder={'{\n  "type": "service_account",\n  "project_id": "my-project",\n  ...\n}'}
                      className="font-mono text-xs resize-none"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}
          </FieldGroup>

          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? "Saving…" : "Save credentials"}
          </Button>
        </form>
      </div>
    </div>
  );
}
