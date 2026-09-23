"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import {
  TUpdateAppFormSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import {
  FormInput,
  FormTextarea,
  FormSwitch,
} from "@/modules/client/shared/custom-form-fields";

type TAppFormSchema = TUpdateAppFormSchema;

interface AppFormProps {
  onSubmit: (data: TAppFormSchema) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function AppForm({ onSubmit, onCancel, submitLabel = "Save" }: AppFormProps) {
  const form = useFormContext<TAppFormSchema>();
  const {
    control,
    setValue,
    formState: { isSubmitting },
  } = form;

  const nameValue = useWatch({ control, name: "name" });

  useEffect(() => {
    const slug = (nameValue ?? "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setValue("slug", slug, { shouldValidate: false });
  }, [nameValue, setValue]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="name"
        label="Name"
        placeholder="e.g. Healthcare Portal"
      />
      <FormInput
        control={control}
        name="slug"
        label="Slug"
        placeholder="e.g. healthcare-portal"
        description="Lowercase letters, numbers, and dashes"
      />
      <FormTextarea
        control={control}
        name="description"
        label="Description"
        placeholder="Optional description"
      />
      <FormSwitch control={control} name="isActive" label="Active" />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
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
