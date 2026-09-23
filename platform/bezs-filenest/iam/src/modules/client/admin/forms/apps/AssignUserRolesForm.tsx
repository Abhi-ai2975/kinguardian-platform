"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssignUserRolesFormProps {
  onSubmit: (roleIds: string[]) => Promise<void>;
  onCancel: () => void;
  availableRoles: { id: string; name: string; description?: string | null }[];
  currentRoleIds: string[];
  isSubmitting: boolean;
}

export function AssignUserRolesForm({
  onSubmit,
  onCancel,
  availableRoles,
  currentRoleIds,
  isSubmitting,
}: AssignUserRolesFormProps) {
  const [selected, setSelected] = useState<string[]>(currentRoleIds);

  function toggle(roleId: string) {
    setSelected((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-60 rounded-md border p-3">
        {availableRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No roles found for this organization.
          </p>
        ) : (
          <div className="space-y-3">
            {availableRoles.map((role) => (
              <div key={role.id} className="flex items-start gap-3">
                <Checkbox
                  id={role.id}
                  checked={selected.includes(role.id)}
                  onCheckedChange={() => toggle(role.id)}
                  disabled={isSubmitting}
                />
                <div className="grid gap-0.5">
                  <Label htmlFor={role.id} className="font-medium cursor-pointer">
                    {role.name}
                  </Label>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="button" onClick={() => onSubmit(selected)} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Roles
        </Button>
      </DialogFooter>
    </div>
  );
}
