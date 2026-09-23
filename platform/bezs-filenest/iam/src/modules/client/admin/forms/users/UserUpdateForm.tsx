"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { TUpdateUserFormSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";

interface UserUpdateFormProps {
  onSubmit: (data: TUpdateUserFormSchema) => Promise<void>;
  onCancel: () => void;
}

export function UserUpdateForm({ onSubmit, onCancel }: UserUpdateFormProps) {
  const form = useFormContext<TUpdateUserFormSchema>();
  const {
    formState: { isSubmitting },
    control,
    handleSubmit,
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={control}
        name="name"
        label="Name"
        placeholder="John Doe"
      />
      <FormInput
        control={control}
        name="email"
        label="Email"
        placeholder="user@example.com"
        type="email"
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
        name="image"
        label="Avatar URL"
        placeholder="https://example.com/avatar.png"
        description="Optional profile picture URL."
        descriptionPlace="bottom"
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  );
}
