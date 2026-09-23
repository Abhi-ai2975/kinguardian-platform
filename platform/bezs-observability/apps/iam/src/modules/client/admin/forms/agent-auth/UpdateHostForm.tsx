"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { TUpdateHostFormSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface UpdateHostFormProps {
  onSubmit: (data: TUpdateHostFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function UpdateHostForm({ onSubmit, onCancel }: UpdateHostFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext<TUpdateHostFormSchema>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="name"
        label="Host Name"
        placeholder="my-service-host"
      />
      <FormInput
        control={control}
        name="default_capabilities"
        label="Default Capabilities"
        placeholder="read_data, write_data"
        description="Comma-separated list of capabilities granted to all agents under this host."
      />
      <FormInput
        control={control}
        name="jwks_url"
        label="JWKS URL"
        placeholder="https://example.com/.well-known/jwks.json"
        description="Optional JWKS endpoint for remote key verification."
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
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
