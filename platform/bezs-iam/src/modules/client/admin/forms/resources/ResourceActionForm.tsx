"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { FormInput, FormSelect } from "@/modules/client/shared/custom-form-fields";
import { SelectItem } from "@/components/ui/select";

// Shared base type — works for both create and update resource action forms
interface IResourceActionFormValues {
  name: string;
  description?: string | null;
  key: string;
  resourceId?: string;
}

interface ResourceActionFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  resources: { id: string; name: string }[];
  showResourceSelect?: boolean;
  submitLabel?: string;
}

export function ResourceActionForm({
  onSubmit,
  onCancel,
  resources,
  showResourceSelect = true,
  submitLabel = "Save",
}: ResourceActionFormProps) {
  const form = useFormContext<IResourceActionFormValues>();
  const {
    control,
    setValue,
    formState: { isSubmitting },
  } = form;

  const resourceId = useWatch({ control, name: "resourceId" });
  const nameValue = useWatch({ control, name: "name" });

  // Auto-generate key from selected resource name + action name (create mode only)
  useEffect(() => {
    if (!showResourceSelect) return;
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource || !nameValue) return;
    const slug = nameValue
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setValue("key", `${resource.name}:${slug}`, { shouldValidate: false });
  }, [resourceId, nameValue, resources, setValue, showResourceSelect]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {showResourceSelect && (
        <FormSelect
          control={control}
          name="resourceId"
          label="Resource"
          placeholder="Select a resource"
        >
          {resources.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </FormSelect>
      )}
      <FormInput
        control={control}
        name="name"
        label="Name"
        placeholder="e.g. Read"
        description="Human-readable action name"
      />
      <FormInput
        control={control}
        name="key"
        label="Key"
        placeholder="e.g. patient:read"
        description="Unique permission key (auto-generated, editable)"
      />
      <FormInput
        control={control}
        name="description"
        label="Description"
        placeholder="e.g. Read patient records"
        description="Optional"
      />

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
