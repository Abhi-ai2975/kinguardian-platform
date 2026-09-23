"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormInput } from "@/modules/client/shared/custom-form-fields";
import { TResourceActionSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";

interface IOrgRoleFormValues {
  role: string;
  permissions: string[];
}

interface OrgRoleFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  availableActions: TResourceActionSchema[];
  showRoleNameInput?: boolean;
  submitLabel?: string;
}

export function OrgRoleForm({
  onSubmit,
  onCancel,
  availableActions,
  showRoleNameInput = true,
  submitLabel = "Save",
}: OrgRoleFormProps) {
  const form = useFormContext<IOrgRoleFormValues>();
  const {
    control,
    formState: { isSubmitting },
  } = form;

  // Group actions by resourceName
  const groups = availableActions.reduce<Record<string, TResourceActionSchema[]>>((acc, action) => {
    const group = action.resourceName ?? "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(action);
    return acc;
  }, {});

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {showRoleNameInput && (
        <FormInput
          control={control}
          name="role"
          label="Role Name"
          placeholder="e.g. doctor"
          description="Lowercase, numbers, hyphens, underscores only"
        />
      )}

      <div className="space-y-3">
        <Label className="text-sm font-medium">Permissions</Label>
        {availableActions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resource actions available.</p>
        ) : (
          <Controller
            control={control}
            name="permissions"
            render={({ field, fieldState }) => (
              <div className="space-y-4 rounded-md border p-3 max-h-72 overflow-y-auto">
                {Object.entries(groups).map(([resourceName, actions]) => (
                  <div key={resourceName} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {resourceName}
                    </p>
                    <div className="space-y-1.5 pl-1">
                      {actions.map((action) => {
                        const checked = field.value.includes(action.key);
                        return (
                          <div key={action.key} className="flex items-center gap-2">
                            <Checkbox
                              id={action.key}
                              checked={checked}
                              onCheckedChange={(v) => {
                                if (v) {
                                  field.onChange([...field.value, action.key]);
                                } else {
                                  field.onChange(field.value.filter((k) => k !== action.key));
                                }
                              }}
                            />
                            <label
                              htmlFor={action.key}
                              className="text-sm cursor-pointer select-none leading-none"
                            >
                              {action.name}{" "}
                              <code className="text-xs text-muted-foreground">({action.key})</code>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
