/**
 * ProjectComplianceConfigForm — compliance settings for a project.
 *
 * Fields are stored immediately but enforcement (WORM, legal hold, retention,
 * data residency) is deferred to Phase 8. A prominent info banner communicates
 * this to the user so they don't mistake "saved" for "enforced".
 *
 * @module
 */
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { updateComplianceConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import {
  ComplianceConfigFormSchema,
  type TComplianceConfigForm,
  type TProjectConfig,
} from "@/modules/entities/schemas/project-config";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

const DATA_RESIDENCY_OPTIONS = [
  { value: "", label: "No restriction" },
  { value: "us", label: "United States" },
  { value: "eu", label: "European Union" },
  { value: "india", label: "India" },
  { value: "middle_east", label: "Middle East" },
  { value: "any", label: "Any region" },
];

interface Props {
  projectId: string;
  config: TProjectConfig;
}

export function ProjectComplianceConfigForm({ projectId, config }: Props) {
  const form = useForm<TComplianceConfigForm>({
    resolver: zodResolver(ComplianceConfigFormSchema),
    defaultValues: {
      retention_days: config.retention_days,
      worm_enabled: config.worm_enabled,
      legal_hold_enabled: config.legal_hold_enabled,
      data_residency: config.data_residency,
    },
  });

  const { execute: save, isPending } = useServerAction(updateComplianceConfigAction, {
    onSuccess: () => toast.success("Compliance settings saved"),
    onError: ({ err }) =>
      handleZSAError({ err, form, fallbackMessage: "Failed to save compliance settings" }),
  });

  async function onSubmit(values: TComplianceConfigForm) {
    await save({
      payload: {
        projectId,
        retention_days: values.retention_days,
        worm_enabled: values.worm_enabled,
        legal_hold_enabled: values.legal_hold_enabled,
        data_residency: values.data_residency || null,
      },
    });
  }

  const toggleFlags: {
    name: "worm_enabled" | "legal_hold_enabled";
    label: string;
    description: string;
  }[] = [
    {
      name: "worm_enabled",
      label: "WORM (write-once read-many)",
      description:
        "Once a file is committed it cannot be modified or deleted. Enforced at Phase 8.",
    },
    {
      name: "legal_hold_enabled",
      label: "Legal hold",
      description:
        "Allow individual files to be placed on legal hold — overrides retention and WORM policies. Enforced at Phase 8.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Compliance settings are stored now and will be enforced by the backend
          starting in <strong>Phase 8</strong>. Saving these values today lets
          you prepare your configuration in advance.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          {/* Retention period */}
          <Field>
            <FieldLabel>Minimum retention period (days)</FieldLabel>
            <FieldDescription>
              Files cannot be deleted until they have been retained for at least
              this many days. Leave blank for no minimum.
            </FieldDescription>
            <Controller
              name="retention_days"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value ? parseInt(e.target.value) : null)
                    }
                    type="number"
                    min="1"
                    placeholder="e.g. 365"
                    className="w-36"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </>
              )}
            />
          </Field>

          {/* WORM + Legal hold toggles */}
          {toggleFlags.map(({ name, label, description }) => (
            <Field key={name}>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FieldLabel className="text-sm font-medium leading-none">
                    {label}
                  </FieldLabel>
                  <FieldDescription className="text-xs max-w-sm">
                    {description}
                  </FieldDescription>
                </div>
                <Controller
                  name={name}
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={label}
                    />
                  )}
                />
              </div>
            </Field>
          ))}

          {/* Data residency */}
          <Field>
            <FieldLabel>Data residency</FieldLabel>
            <FieldDescription>
              Geographic region where file bytes must be stored. Checked against
              the storage provider region at upload time (Phase 8).
            </FieldDescription>
            <Controller
              name="data_residency"
              control={form.control}
              render={({ field }) => (
                <NativeSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  className="w-56"
                >
                  {DATA_RESIDENCY_OPTIONS.map((o) => (
                    <NativeSelectOption key={o.value} value={o.value}>
                      {o.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            />
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {isPending ? "Saving…" : "Save compliance settings"}
        </Button>
      </form>
    </div>
  );
}
