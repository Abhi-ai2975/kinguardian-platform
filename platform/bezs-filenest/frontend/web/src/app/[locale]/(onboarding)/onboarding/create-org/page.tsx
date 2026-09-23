/**
 * Create-org onboarding step.
 *
 * Pre-populates the org name from the user's display name so they can just
 * hit Continue without typing. Slug is derived automatically from the name
 * but is editable. Submits to /api/onboarding/org which calls the IAM.
 *
 * @module
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";

const createOrgSchema = z.object({
  name: z.string().min(1, "Organisation name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
});

type TCreateOrgForm = z.infer<typeof createOrgSchema>;

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

interface CreateOrgPageProps {
  searchParams: Promise<{ name?: string }>;
}

export default function CreateOrgPage({ searchParams }: CreateOrgPageProps) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = React.useState(false);

  const form = useForm<TCreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "", slug: "" },
  });

  const slug = form.watch("slug");

  // Pre-populate from ?name= query param (set by the app layout from session).
  React.useEffect(() => {
    searchParams.then(({ name: prefill }) => {
      if (prefill && !form.getValues("name")) {
        form.setValue("name", prefill);
        form.setValue("slug", toSlug(prefill));
      }
    });
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: TCreateOrgForm) {
    const res = await fetch("/api/onboarding/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name.trim(), slug: values.slug.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Failed to create organisation");
      return;
    }

    router.push(`/onboarding/create-project?orgId=${data.orgId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Name your organisation</CardTitle>
        <CardDescription>
          This is your team or company workspace. You can change it later in
          settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Organisation name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Acme Inc."
                    autoFocus
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      field.onChange(e);
                      if (!slugEdited) {
                        form.setValue("slug", toSlug(e.target.value));
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
                  <FieldLabel htmlFor={field.name}>URL slug</FieldLabel>
                  <FieldDescription>
                    console.filenest.io/
                    <span className="font-medium text-foreground">
                      {slug || "your-org"}
                    </span>
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="acme-inc"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      setSlugEdited(true);
                      form.setValue("slug", toSlug(e.target.value));
                    }}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Creating…"
              : "Create organisation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
