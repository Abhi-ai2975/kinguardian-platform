/**
 * ProjectSecurityConfigForm — network security settings for a project.
 *
 * Configures IP allowlist (CIDR blocks), CORS allowed origins, signed-URL
 * requirement, and signed-URL TTL. Null lists mean "no restriction".
 *
 * @module
 */
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Save, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { updateSecurityConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import {
  SecurityConfigFormSchema,
  type TSecurityConfigForm,
  type TProjectConfig,
} from "@/modules/entities/schemas/project-config";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

interface TagInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}

function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  function add() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={add} disabled={!draft.trim()}>
          <Plus className="size-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              <span className="text-xs font-mono">{tag}</span>
              <button
                type="button"
                onClick={() => remove(tag)}
                className="rounded hover:text-destructive transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  projectId: string;
  config: TProjectConfig;
}

export function ProjectSecurityConfigForm({ projectId, config }: Props) {
  const form = useForm<TSecurityConfigForm>({
    resolver: zodResolver(SecurityConfigFormSchema),
    defaultValues: {
      allowed_ips: config.allowed_ips ?? [],
      allowed_origins: config.allowed_origins ?? [],
      require_signed_urls: config.require_signed_urls,
      signed_url_ttl_seconds: config.signed_url_ttl_seconds,
    },
  });

  const requireSigned = form.watch("require_signed_urls");

  const { execute: save, isPending } = useServerAction(updateSecurityConfigAction, {
    onSuccess: () => toast.success("Security settings saved"),
    onError: ({ err }) =>
      handleZSAError({ err, form, fallbackMessage: "Failed to save security settings" }),
  });

  async function onSubmit(values: TSecurityConfigForm) {
    await save({
      payload: {
        projectId,
        allowed_ips: values.allowed_ips.length ? values.allowed_ips : null,
        allowed_origins: values.allowed_origins.length ? values.allowed_origins : null,
        require_signed_urls: values.require_signed_urls,
        signed_url_ttl_seconds: values.signed_url_ttl_seconds,
      },
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        {/* IP allowlist */}
        <Field>
          <FieldLabel>IP allowlist</FieldLabel>
          <FieldDescription>
            CIDR blocks that may call the API for this project (e.g.{" "}
            <code>10.0.0.0/8</code>, <code>203.0.113.42/32</code>). Leave empty
            to allow all IPs.
          </FieldDescription>
          <Controller
            name="allowed_ips"
            control={form.control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="10.0.0.0/8"
              />
            )}
          />
        </Field>

        {/* Allowed origins */}
        <Field>
          <FieldLabel>Allowed origins (CORS)</FieldLabel>
          <FieldDescription>
            Origins permitted to make browser requests (e.g.{" "}
            <code>https://app.example.com</code>). Leave empty to allow all
            origins.
          </FieldDescription>
          <Controller
            name="allowed_origins"
            control={form.control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="https://app.example.com"
              />
            )}
          />
        </Field>

        {/* Require signed URLs */}
        <Field>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FieldLabel className="text-sm font-medium leading-none">
                Require signed URLs (upload &amp; download)
              </FieldLabel>
              <FieldDescription className="text-xs">
                When enabled, the SDK defaults to presigned URL mode for both
                uploads and downloads. The signed URL TTL below applies to all
                generated URLs.
              </FieldDescription>
            </div>
            <Controller
              name="require_signed_urls"
              control={form.control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Require signed URLs"
                />
              )}
            />
          </div>
        </Field>

        {/* Signed URL TTL — only shown when require_signed_urls is on */}
        {requireSigned && (
          <Field>
            <FieldLabel>Signed URL TTL (seconds)</FieldLabel>
            <FieldDescription>
              How long generated signed URLs remain valid. Min 60 s, max 86400 s
              (24 h). Default 3600 s (1 h).
            </FieldDescription>
            <Controller
              name="signed_url_ttl_seconds"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    type="number"
                    min="60"
                    max="86400"
                    placeholder="3600"
                    className="w-36"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </>
              )}
            />
          </Field>
        )}
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        <Save className="h-4 w-4 mr-1.5" />
        {isPending ? "Saving…" : "Save security settings"}
      </Button>
    </form>
  );
}
