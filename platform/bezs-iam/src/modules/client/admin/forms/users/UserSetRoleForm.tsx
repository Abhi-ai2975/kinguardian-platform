"use client";

import { useFormContext } from "react-hook-form";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { TSetUserRoleFormSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { FormSelect } from "@/modules/client/shared/custom-form-fields";

interface UserSetRoleFormProps {
  onSubmit: (data: TSetUserRoleFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function UserSetRoleForm({ onSubmit, onCancel }: UserSetRoleFormProps) {
  const form = useFormContext<TSetUserRoleFormSchema>();
  const { control, formState: { isSubmitting } } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormSelect control={control} name="role" label="New Role">
        <SelectItem value="guest">Guest</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="superadmin">Super Admin</SelectItem>
      </FormSelect>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Role
        </Button>
      </DialogFooter>
    </form>
  );
}
