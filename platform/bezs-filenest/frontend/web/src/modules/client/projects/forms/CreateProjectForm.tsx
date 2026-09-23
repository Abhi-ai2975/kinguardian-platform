/**
 * CreateProjectForm — client form for creating a new project.
 *
 * Uses react-hook-form + zodResolver for local validation and
 * useServerAction(createProjectAction) for submission. Field-level server
 * errors (InputParseError) are applied back to the form via handleZSAError.
 * On success redirects to the new project's file explorer, or calls the
 * optional onSuccess callback (used in the onboarding wizard).
 *
 * @module
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
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
import { createProjectAction } from "@/modules/server/presentation/actions/project.actions";
import {
  CreateProjectFormSchema,
  type TCreateProjectForm,
} from "@/modules/entities/schemas/project";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";
import type { TProject } from "@/modules/entities/schemas/project";

interface CreateProjectFormProps {
  onSuccess?: (data: TProject) => void;
}

const STORAGE_MODES = [
  { value: "managed", label: "Managed — FileNest provisions storage for you" },
  { value: "byob", label: "BYOB — Bring your own bucket" },
] as const;

const STORAGE_PROVIDERS = [
  { value: "rustfs", label: "RustFS" },
  { value: "s3", label: "Amazon S3" },
  { value: "azure_blob", label: "Azure Blob Storage" },
  { value: "gcs", label: "Google Cloud Storage" },
  { value: "minio", label: "MinIO" },
  { value: "r2", label: "Cloudflare R2" },
] as const;

// Providers available in managed mode. Everything else is "coming soon".
const MANAGED_AVAILABLE = new Set<string>(["rustfs"]);

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export function CreateProjectForm({ onSuccess }: CreateProjectFormProps = {}) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = React.useState(false);

  const form = useForm<TCreateProjectForm>({
    resolver: zodResolver(CreateProjectFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      storage_mode: "managed",
      storage_provider: "rustfs",
    },
  });

  const { execute, isPending } = useServerAction(createProjectAction, {
    onSuccess: ({ data }) => {
      if (onSuccess) {
        onSuccess(data);
      } else {
        toast.success("Project created");
        router.push(`/projects/${data.id}/files`);
      }
    },
    onError: ({ err }) =>
      handleZSAError({ err, form, fallbackMessage: "Failed to create project" }),
  });

  async function onSubmit(values: TCreateProjectForm) {
    await execute({
      payload: values,
      transportOptions: { shouldRevalidate: true, url: "/projects" },
    });
  }

  const slug = form.watch("slug");
  const storageMode = form.watch("storage_mode");

  // When switching to managed mode, reset provider to the first available one
  // if the currently selected provider isn't supported in managed mode.
  React.useEffect(() => {
    if (storageMode === "managed") {
      const current = form.getValues("storage_provider");
      if (!MANAGED_AVAILABLE.has(current)) {
        form.setValue("storage_provider", "rustfs");
      }
    }
  }, [storageMode, form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Project name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="My Project"
                autoFocus
                aria-invalid={fieldState.invalid}
                onChange={(e) => {
                  field.onChange(e);
                  if (!slugEdited) {
                    form.setValue("slug", toSlug(e.target.value), {
                      shouldValidate: false,
                    });
                  }
                }}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="slug"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
              <FieldDescription>
                Used in API calls: {slug || "my-project"}
              </FieldDescription>
              <Input
                {...field}
                id={field.name}
                placeholder="my-project"
                aria-invalid={fieldState.invalid}
                onChange={(e) => {
                  setSlugEdited(true);
                  form.setValue("slug", toSlug(e.target.value), {
                    shouldValidate: false,
                  });
                }}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Description (optional)</FieldLabel>
              <Textarea
                {...field}
                id={field.name}
                placeholder="A short description of this project"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="storage_mode"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Storage mode</FieldLabel>
              <NativeSelect
                id={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={fieldState.invalid}
                className="w-full"
              >
                {STORAGE_MODES.map(({ value, label }) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        {storageMode === "byob" && (
          <p className="text-xs text-muted-foreground">
            You&apos;ll enter bucket credentials in{" "}
            <strong className="text-foreground">
              Project Settings → Storage
            </strong>{" "}
            after creation.
          </p>
        )}

        <Controller
          name="storage_provider"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Storage provider</FieldLabel>
              <NativeSelect
                id={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={fieldState.invalid}
                className="w-full"
              >
                {STORAGE_PROVIDERS.map(({ value, label }) => {
                  const comingSoon =
                    storageMode === "managed" && !MANAGED_AVAILABLE.has(value);
                  return (
                    <NativeSelectOption
                      key={value}
                      value={value}
                      disabled={comingSoon}
                    >
                      {comingSoon ? `${label} (coming soon)` : label}
                    </NativeSelectOption>
                  );
                })}
              </NativeSelect>
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
