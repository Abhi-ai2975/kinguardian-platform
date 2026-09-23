"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { TAddMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { FormInput } from "@/modules/client/shared/custom-form-fields";
import { cn } from "@/lib/utils";

interface AddMemberFormProps {
  onSubmit: (data: TAddMemberValidationSchema) => Promise<void>;
  onCancel: () => void;
  availableRoles: string[];
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AddMemberForm({ onSubmit, onCancel, availableRoles }: AddMemberFormProps) {
  const form = useFormContext<TAddMemberValidationSchema>();
  const {
    control,
    formState: { isSubmitting, errors },
  } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput control={control} name="email" label="Email Address" placeholder="user@example.com" type="email" />

      <div className="space-y-2">
        <p className="text-sm font-medium">Roles</p>
        <Controller
          control={control}
          name="roles"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {availableRoles.map((role) => {
                const checked = field.value?.includes(role) ?? false;
                return (
                  <label
                    key={role}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm",
                      checked && "border-primary bg-primary/5",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const next = val
                          ? [...(field.value ?? []), role]
                          : (field.value ?? []).filter((r) => r !== role);
                        field.onChange(next);
                      }}
                    />
                    {roleLabel(role)}
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.roles && (
          <FormMessage>{errors.roles.message}</FormMessage>
        )}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Member
        </Button>
      </DialogFooter>
    </form>
  );
}
