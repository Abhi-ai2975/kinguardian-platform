"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import {
  UpdateOrgRoleValidationSchema,
  TUpdateOrgRoleValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { TResourceActionSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { updateOrgRoleAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { listResourceActionsAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { OrgRoleForm } from "../../forms/organizations/OrgRoleForm";

export const EditOrgRoleModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "editOrgRole";

  const [availableActions, setAvailableActions] = useState<TResourceActionSchema[]>([]);

  const { execute: fetchActions, isPending: isLoading } = useServerAction(listResourceActionsAction, {
    onSuccess({ data }) {
      setAvailableActions(data);
    },
  });

  useEffect(() => {
    if (!isModalOpen) return;
    void fetchActions();
  }, [isModalOpen]);

  const form = useForm<TUpdateOrgRoleValidationSchema>({
    resolver: zodResolver(UpdateOrgRoleValidationSchema),
    values: {
      organizationId: modalData?.orgRoleOrganizationId ?? "",
      role: modalData?.orgRoleName ?? "",
      permissions: modalData?.orgRolePermissions ?? [],
    },
  });

  const { execute } = useServerAction(updateOrgRoleAction, {
    onSuccess() {
      toast.success("Role updated successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateOrgRoleValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to update role",
      });
    },
  });

  async function handleSubmit(values: TUpdateOrgRoleValidationSchema) {
    await execute({
      payload: values,
      transportOptions: {
        shouldRevalidate: true,
        url: `/admin/organizations/${modalData?.orgRoleOrganizationId}/roles`,
      },
    });
  }

  function handleClose() {
    form.reset();
    setAvailableActions([]);
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Role: {modalData?.orgRoleName}</DialogTitle>
          <DialogDescription>
            Update the permissions assigned to this role.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="rounded-md border p-3 space-y-3 max-h-72">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        ) : (
          <FormProvider {...form}>
            <OrgRoleForm
              onSubmit={handleSubmit}
              onCancel={handleClose}
              availableActions={availableActions}
              showRoleNameInput={false}
              submitLabel="Save Changes"
            />
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};
