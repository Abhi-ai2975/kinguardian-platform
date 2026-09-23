"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { TCreateOrganizationValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface OrgCreateFormProps {
  onSubmit: (data: TCreateOrganizationValidationSchema) => Promise<void>;
  onCancel: () => void;
}

export function OrgCreateForm({ onSubmit, onCancel }: OrgCreateFormProps) {
  const form = useFormContext<TCreateOrganizationValidationSchema>();
  const {
    control,
    formState: { isSubmitting },
  } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="name"
        label="Organization Name"
        placeholder="Acme Inc."
      />
      <FormInput
        control={control}
        name="slug"
        label="Slug"
        placeholder="acme-inc"
        description="Lowercase letters, numbers, and hyphens only"
      />
      <FormInput
        control={control}
        name="logo"
        label="Logo URL"
        placeholder="https://example.com/logo.png"
        description="Optional"
      />
      <FormInput
        control={control}
        name="metadata"
        label="Metadata"
        placeholder='{"key": "value"}'
        description="Optional JSON metadata"
      />

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Organization
        </Button>
      </DialogFooter>
    </form>
  );
}
