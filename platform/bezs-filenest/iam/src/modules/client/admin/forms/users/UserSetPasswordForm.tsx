"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { TSetUserPasswordFormSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface UserSetPasswordFormProps {
  onSubmit: (data: TSetUserPasswordFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function UserSetPasswordForm({ onSubmit, onCancel }: UserSetPasswordFormProps) {
  const form = useFormContext<TSetUserPasswordFormSchema>();
  const { control, formState: { isSubmitting } } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="newPassword"
        label="New Password"
        type="password"
        placeholder="Min. 8 characters"
      />
      <FormInput
        control={control}
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="Re-enter new password"
      />

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set Password
        </Button>
      </DialogFooter>
    </form>
  );
}
