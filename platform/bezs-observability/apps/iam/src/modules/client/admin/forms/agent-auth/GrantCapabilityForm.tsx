"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { TGrantCapabilityFormSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface GrantCapabilityFormProps {
  onSubmit: (data: TGrantCapabilityFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function GrantCapabilityForm({
  onSubmit,
  onCancel,
}: GrantCapabilityFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext<TGrantCapabilityFormSchema>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="capabilities"
        label="Capabilities"
        placeholder="read_data, write_data, admin"
        description="Comma-separated list of capability names to grant."
      />
      <FormInput
        control={control}
        name="ttl"
        label="TTL (seconds)"
        placeholder="3600"
        description="Optional time-to-live in seconds. Leave empty for no expiry."
        type="number"
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
          Grant
        </Button>
      </DialogFooter>
    </form>
  );
}
