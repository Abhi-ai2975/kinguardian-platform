"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { TUpdateMemberRoleValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { cn } from "@/lib/utils";

interface UpdateMemberRoleFormProps {
  onSubmit: (data: TUpdateMemberRoleValidationSchema) => Promise<void>;
  onCancel: () => void;
  availableRoles: string[];
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function UpdateMemberRoleForm({ onSubmit, onCancel, availableRoles }: UpdateMemberRoleFormProps) {
  const form = useFormContext<TUpdateMemberRoleValidationSchema>();
  const {
    control,
    register,
    getValues,
    setValue,
    formState: { isSubmitting, errors },
  } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Roles</p>
        <Controller
          control={control}
          name="roles"
          render={({ field }) => (
            <div className="space-y-2">
              {availableRoles.map((role) => {
                const checked = field.value?.includes(role) ?? false;
                return (
                  <div key={role} className="space-y-1.5">
                    <label
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
                          const current = getValues("redirectUrls") ?? {};
                          if (val) {
                            if (!current[role]) {
                              setValue("redirectUrls", { ...current, [role]: "/" });
                            }
                          } else {
                            setValue("redirectUrls", { ...current, [role]: "" });
                          }
                        }}
                      />
                      {roleLabel(role)}
                    </label>
                    {checked && (
                      <div className="pl-6">
                        <Input
                          {...register(`redirectUrls.${role}` as `redirectUrls.${string}`)}
                          placeholder="Redirect URL (optional)"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
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
          Update Role
        </Button>
      </DialogFooter>
    </form>
  );
}
