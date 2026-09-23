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
  CreateOrgRoleValidationSchema,
  TCreateOrgRoleValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { TResourceActionSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { createOrgRoleAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { listResourceActionsAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { OrgRoleForm } from "../../forms/organizations/OrgRoleForm";

export const CreateOrgRoleModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "createOrgRole";

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

  const form = useForm<TCreateOrgRoleValidationSchema>({
    resolver: zodResolver(CreateOrgRoleValidationSchema),
    defaultValues: { organizationId: "", role: "", permissions: [] },
  });

  const { execute } = useServerAction(createOrgRoleAction, {
    onSuccess() {
      toast.success("Role created successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TCreateOrgRoleValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to create role",
      });
    },
  });

  async function handleSubmit(values: TCreateOrgRoleValidationSchema) {
    const organizationId = modalData?.orgRoleOrganizationId ?? "";
    await execute({
      payload: { ...values, organizationId },
      transportOptions: {
        shouldRevalidate: true,
        url: `/admin/organizations/${organizationId}/roles`,
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
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>
            Define a custom role and assign permissions to it.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-56" />
            </div>
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
              showRoleNameInput
              submitLabel="Create Role"
            />
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};
