"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import {
  TCreateTeamValidationSchema,
  TUpdateTeamValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface TeamCreateFormProps {
  onSubmit: (data: TCreateTeamValidationSchema) => Promise<void>;
  onCancel: () => void;
  isEdit?: false;
}

interface TeamEditFormProps {
  onSubmit: (data: TUpdateTeamValidationSchema) => Promise<void>;
  onCancel: () => void;
  isEdit: true;
}

type TeamFormProps = TeamCreateFormProps | TeamEditFormProps;

export function TeamForm({ onSubmit, onCancel, isEdit }: TeamFormProps) {
  const form = useFormContext<TCreateTeamValidationSchema | TUpdateTeamValidationSchema>();
  const {
    control,
    formState: { isSubmitting },
  } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit as (data: TCreateTeamValidationSchema | TUpdateTeamValidationSchema) => Promise<void>)} className="space-y-4">
      <FormInput control={control} name="name" label="Team Name" placeholder="Engineering" />

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Team"}
        </Button>
      </DialogFooter>
    </form>
  );
}
