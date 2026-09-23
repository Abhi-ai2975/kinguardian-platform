"use client";

import { useFormContext } from "react-hook-form";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { TCreateUserFormSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { FormInput, FormSelect } from "@/modules/client/shared/custom-form-fields";

interface UserCreateFormProps {
  onSubmit: (data: TCreateUserFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function UserCreateForm({ onSubmit, onCancel }: UserCreateFormProps) {
  const form = useFormContext<TCreateUserFormSchema>();
  const { control, formState: { isSubmitting } } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="name"
        label="Full Name"
        placeholder="John Doe"
      />
      <FormInput
        control={control}
        name="email"
        label="Email"
        type="email"
        placeholder="john@example.com"
      />
      <FormInput
        control={control}
        name="username"
        label="Username"
        placeholder="e.g. john_doe"
        description="Optional. Lowercase, numbers, _ and - only."
        descriptionPlace="bottom"
      />
      <FormInput
        control={control}
        name="password"
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
      />
      <FormSelect control={control} name="role" label="Role">
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
          Create User
        </Button>
      </DialogFooter>
    </form>
  );
}
