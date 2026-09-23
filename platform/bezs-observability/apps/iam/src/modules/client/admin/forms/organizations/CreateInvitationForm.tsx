"use client";

import { useFormContext } from "react-hook-form";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { TCreateInvitationValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { FormInput, FormSelect } from "@/modules/client/shared/custom-form-fields";

interface CreateInvitationFormProps {
  onSubmit: (data: TCreateInvitationValidationSchema) => Promise<void>;
  onCancel: () => void;
}

export function CreateInvitationForm({ onSubmit, onCancel }: CreateInvitationFormProps) {
  const form = useFormContext<TCreateInvitationValidationSchema>();
  const {
    control,
    formState: { isSubmitting },
  } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="email"
        label="Email Address"
        type="email"
        placeholder="user@example.com"
      />
      <FormSelect control={control} name="role" label="Role">
        <SelectItem value="member">Member</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="owner">Owner</SelectItem>
      </FormSelect>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Invitation
        </Button>
      </DialogFooter>
    </form>
  );
}
