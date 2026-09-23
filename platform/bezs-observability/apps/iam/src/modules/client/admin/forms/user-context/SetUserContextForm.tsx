"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  TSetUserContextValidationSchema,
  TUserOrgMembershipSchema,
  TOrgRoleForContextSchema,
} from "@/modules/entities/schemas/admin/user-context/user-context.schema";

interface SetUserContextFormProps {
  onSubmit: (data: TSetUserContextValidationSchema) => Promise<void>;
  onCancel: () => void;
  memberships: TUserOrgMembershipSchema[];
  orgRoles: TOrgRoleForContextSchema[];
  isFetchingRoles: boolean;
  selectedOrgId: string | null;
  selectedRoleId: string | null;
  onOrgSelect: (orgId: string) => void;
  onRoleSelect: (roleId: string) => void;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SetUserContextForm({
  onSubmit,
  onCancel,
  memberships,
  orgRoles,
  isFetchingRoles,
  selectedOrgId,
  selectedRoleId,
  onOrgSelect,
  onRoleSelect,
}: SetUserContextFormProps) {
  const form = useFormContext<TSetUserContextValidationSchema>();
  const {
    formState: { isSubmitting, errors },
  } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Step 1: Organization ── */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Organization</p>
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This user is not a member of any organization.
          </p>
        ) : (
          <div className="space-y-1.5">
            {memberships.map((m) => {
              const isSelected = selectedOrgId === m.organizationId;
              return (
                <button
                  key={m.organizationId}
                  type="button"
                  onClick={() => onOrgSelect(m.organizationId)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md border px-3 py-2.5 text-sm text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <span>{m.organizationName}</span>
                  <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                    {capitalize(m.role)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {errors.activeOrganizationId && (
          <FormMessage>{errors.activeOrganizationId.message}</FormMessage>
        )}
      </div>

      {/* ── Step 2: Role (shown once an org is selected) ── */}
      {selectedOrgId && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Role</p>
          {isFetchingRoles ? (
            <div className="space-y-1.5">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : orgRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No roles defined for this organization.
            </p>
          ) : (
            <div className="space-y-1.5">
              {orgRoles.map((r) => {
                const isSelected = selectedRoleId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onRoleSelect(r.id)}
                    className={cn(
                      "w-full flex items-center rounded-md border px-3 py-2.5 text-sm text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 font-medium"
                        : "hover:bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {capitalize(r.role)}
                  </button>
                );
              })}
            </div>
          )}
          {errors.activeRoleId && (
            <FormMessage>{errors.activeRoleId.message}</FormMessage>
          )}
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={isSubmitting || memberships.length === 0 || !selectedRoleId}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set Context
        </Button>
      </DialogFooter>
    </form>
  );
}
