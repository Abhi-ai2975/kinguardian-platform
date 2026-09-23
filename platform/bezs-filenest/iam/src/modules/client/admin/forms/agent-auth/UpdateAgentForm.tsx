"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { TUpdateAgentFormSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface UpdateAgentFormProps {
  onSubmit: (data: TUpdateAgentFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function UpdateAgentForm({ onSubmit, onCancel }: UpdateAgentFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext<TUpdateAgentFormSchema>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="name"
        label="Agent Name"
        placeholder="my-agent"
        description="Update the display name of this agent."
      />
      <FormInput
        control={control}
        name="metadata"
        label="Metadata (JSON)"
        placeholder='{"env": "production", "version": "2"}'
        description="Optional JSON object with custom metadata. Must be valid JSON."
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
