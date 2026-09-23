"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { TAddTeamMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface AddTeamMemberFormProps {
  onSubmit: (data: TAddTeamMemberValidationSchema) => Promise<void>;
  onCancel: () => void;
}

export function AddTeamMemberForm({ onSubmit, onCancel }: AddTeamMemberFormProps) {
  const form = useFormContext<TAddTeamMemberValidationSchema>();
  const {
    control,
    formState: { isSubmitting },
  } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput control={control} name="email" label="Email Address" placeholder="user@example.com" type="email" />

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add to Team
        </Button>
      </DialogFooter>
    </form>
  );
}
