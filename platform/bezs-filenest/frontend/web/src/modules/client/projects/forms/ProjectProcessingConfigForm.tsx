/**
 * ProjectProcessingConfigForm — processing feature flag toggles for a project.
 *
 * Versioning, OCR, and virus scan are toggled per project. Each switch saves
 * immediately on form submit rather than on change to avoid stale state.
 *
 * @module
 */
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { updateProcessingConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import {
  ProcessingConfigFormSchema,
  type TProcessingConfigForm,
  type TProjectConfig,
} from "@/modules/entities/schemas/project-config";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

interface Props {
  projectId: string;
  config: TProjectConfig;
}

export function ProjectProcessingConfigForm({ projectId, config }: Props) {
  const form = useForm<TProcessingConfigForm>({
    resolver: zodResolver(ProcessingConfigFormSchema),
    defaultValues: {
      versioning_enabled: config.versioning_enabled,
      virus_scan_enabled: config.virus_scan_enabled,
    },
  });

  const { execute: save, isPending } = useServerAction(updateProcessingConfigAction, {
    onSuccess: () => toast.success("Processing settings saved"),
    onError: ({ err }) =>
      handleZSAError({ err, form, fallbackMessage: "Failed to save processing settings" }),
  });

  async function onSubmit(values: TProcessingConfigForm) {
    await save({ payload: { projectId, ...values } });
  }

  const flags: {
    name: keyof TProcessingConfigForm;
    label: string;
    description: string;
  }[] = [
    {
      name: "versioning_enabled",
      label: "File versioning",
      description:
        "Keep previous versions of every file. Each upload creates a new version rather than replacing the existing file.",
    },
    {
      name: "virus_scan_enabled",
      label: "Virus scanning",
      description:
        "Scan every uploaded file with ClamAV before marking it ready. Files that fail scanning are quarantined.",
    },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        {flags.map(({ name, label, description }) => (
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

        {/* OCR — deferred to a later release */}
        <Field>
          <div className="flex items-center justify-between rounded-lg border p-4 opacity-60">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <FieldLabel className="text-sm font-medium leading-none">
                  OCR extraction
                </FieldLabel>
                <Badge variant="secondary" className="text-xs">Coming soon</Badge>
              </div>
              <FieldDescription className="text-xs max-w-sm">
                Run optical character recognition on PDFs and images after upload.
                Extracted text will be indexed for full-text search.
              </FieldDescription>
            </div>
            <Switch disabled aria-label="OCR extraction — coming soon" />
          </div>
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        <Save className="h-4 w-4 mr-1.5" />
        {isPending ? "Saving…" : "Save processing settings"}
      </Button>
    </form>
  );
}
