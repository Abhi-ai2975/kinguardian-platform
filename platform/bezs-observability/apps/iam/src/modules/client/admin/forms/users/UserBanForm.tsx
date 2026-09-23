"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { TBanUserFormSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface UserBanFormProps {
  onSubmit: (data: TBanUserFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function UserBanForm({ onSubmit, onCancel }: UserBanFormProps) {
  const form = useFormContext<TBanUserFormSchema>();
  const { control, formState: { isSubmitting } } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="banReason"
        label="Ban Reason (optional)"
        placeholder="Violation of terms of service..."
      />
      <FormInput
        control={control}
        name="banExpiresInDays"
        label="Expires in (days)"
        type="number"
        placeholder="0 = permanent"
      />
      <p className="text-xs text-muted-foreground">
        Set to 0 for a permanent ban. Enter the number of days for a temporary ban.
      </p>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" variant="destructive" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ban User
        </Button>
      </DialogFooter>
    </form>
  );
}
