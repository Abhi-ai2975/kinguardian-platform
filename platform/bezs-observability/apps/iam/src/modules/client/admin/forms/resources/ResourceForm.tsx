"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import {
  TCreateResourceFormSchema,
  TUpdateResourceFormSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

type TResourceFormSchema = TCreateResourceFormSchema | TUpdateResourceFormSchema;

interface ResourceFormProps {
  onSubmit: (data: TResourceFormSchema) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function ResourceForm({
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: ResourceFormProps) {
  const form = useFormContext<TResourceFormSchema>();
  const {
    control,
    formState: { isSubmitting },
  } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="name"
        label="Name"
        placeholder="e.g. patient"
        description="Unique identifier for this resource"
      />
      <FormInput
        control={control}
        name="description"
        label="Description"
        placeholder="e.g. Patient records and data"
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
