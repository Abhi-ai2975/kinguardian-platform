/**
 * CreateApiKeyForm — form for creating a new project-scoped API key.
 *
 * Submits via createApiKeyAction. On success calls onSuccess with the full
 * TCreatedApiKey so the modal can switch to the "show key" step.
 *
 * @module
 */
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { createApiKeyAction } from "@/modules/server/presentation/actions/api-key.actions";
import {
  CreateApiKeyFormSchema,
  AVAILABLE_SCOPES,
  type TCreateApiKeyForm,
  type TCreatedApiKey,
} from "@/modules/entities/schemas/api-key";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

const SCOPE_GROUPS: {
  label: string;
  description: string;
  scopes: (typeof AVAILABLE_SCOPES)[number][];
}[] = [
  {
    label: "Files",
    description: "Upload, download, read, delete, and update file metadata.",
    scopes: ["files:upload", "files:download", "files:read", "files:delete", "files:metadata"],
  },
  {
    label: "Folders",
    description: "Create folders, resolve paths, and move files.",
    scopes: ["folders:read", "folders:write"],
  },
  {
    label: "Upload Tokens",
    description: "Issue short-lived browser upload tokens for client-side uploads.",
    scopes: ["upload_tokens:create"],
  },
  {
    label: "Webhooks",
    description: "Manage webhook endpoints and view delivery history.",
    scopes: ["webhooks:read", "webhooks:write"],
  },
  {
    label: "Projects",
    description: "Read and update project settings and storage configuration.",
    scopes: ["projects:read", "projects:update"],
  },
  {
    label: "Audit & Compliance",
    description: "Access audit logs and manage WORM, legal hold, and retention policies.",
    scopes: ["audit:read", "compliance:manage"],
  },
];

interface CreateApiKeyFormProps {
  organizationId: string;
  projectId: string;
  onSuccess: (key: TCreatedApiKey) => void;
}

export function CreateApiKeyForm({ organizationId, projectId, onSuccess }: CreateApiKeyFormProps) {
  const form = useForm<TCreateApiKeyForm>({
    resolver: zodResolver(CreateApiKeyFormSchema),
    defaultValues: {
      name: "",
      scopes: ["files:upload", "files:download", "files:read", "files:delete", "files:metadata"],
    },
  });

  const { execute, isPending } = useServerAction(createApiKeyAction, {
    onSuccess: ({ data }) => {
      onSuccess(data);
    },
    onError: ({ err }) =>
      handleZSAError({ err, form, fallbackMessage: "Failed to create API key" }),
  });

  async function onSubmit(values: TCreateApiKeyForm) {
    await execute({
      payload: {
        name: values.name,
        organizationId,
        projectId,
        scopes: values.scopes,
        expiresInDays: values.expiresInDays ? parseInt(values.expiresInDays, 10) : undefined,
      },
    });
  }

  const watchedScopes = form.watch("scopes");

  function toggleScope(scope: (typeof AVAILABLE_SCOPES)[number]) {
    const current = form.getValues("scopes");
    if (current.includes(scope)) {
      form.setValue("scopes", current.filter((s) => s !== scope), { shouldValidate: true });
    } else {
      form.setValue("scopes", [...current, scope], { shouldValidate: true });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Key name</FieldLabel>
              <FieldDescription>A label to identify this key, e.g. "production server".</FieldDescription>
              <Input
                {...field}
                id={field.name}
                placeholder="production server"
                autoFocus
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field>
          <FieldLabel>Scopes</FieldLabel>
          <FieldDescription>Permissions granted to this key.</FieldDescription>
          <div className="space-y-3 mt-1">
            {SCOPE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  {group.label}
                </p>
                <p className="text-xs text-muted-foreground mb-1.5">{group.description}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {group.scopes.map((scope) => (
                    <label
                      key={scope}
                      className="flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={watchedScopes.includes(scope)}
                        onCheckedChange={() => toggleScope(scope)}
                      />
                      <span className="font-mono text-xs">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {form.formState.errors.scopes && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.scopes.message}
            </p>
          )}
        </Field>

        <Controller
          name="expiresInDays"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Expires in (days, optional)</FieldLabel>
              <FieldDescription>Leave blank for a non-expiring key.</FieldDescription>
              <Input
                {...field}
                id={field.name}
                type="number"
                min={1}
                max={365}
                placeholder="90"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating…" : "Create API key"}
      </Button>
    </form>
  );
}
