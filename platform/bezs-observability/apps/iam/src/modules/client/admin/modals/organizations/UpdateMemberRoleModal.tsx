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
  UpdateMemberRoleValidationSchema,
  TUpdateMemberRoleValidationSchema,
  TOrgRoleSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import {
  updateMemberRoleAction,
  listOrgRolesAction,
  getOrgRoleRedirectsAction,
} from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { UpdateMemberRoleForm } from "../../forms/organizations/UpdateMemberRoleForm";

const DEFAULT_ROLES = ["member", "admin", "owner"];

export const UpdateMemberRoleModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "updateMemberRole";

  const [availableRoles, setAvailableRoles] = useState<string[]>(DEFAULT_ROLES);
  const [existingRedirectUrls, setExistingRedirectUrls] = useState<Record<string, string>>({});

  const { execute: fetchRoles, isPending: isFetchingRoles } = useServerAction(listOrgRolesAction, {
    onSuccess({ data }) {
      const customRoles = (data as TOrgRoleSchema[]).map((r) => r.role);
      const combined = [
        ...DEFAULT_ROLES,
        ...customRoles.filter((r) => !DEFAULT_ROLES.includes(r)),
      ];
      setAvailableRoles(combined);
    },
  });

  const { execute: fetchRedirects, isPending: isFetchingRedirects } = useServerAction(
    getOrgRoleRedirectsAction,
    {
      onSuccess({ data }) {
        setExistingRedirectUrls((data as Record<string, string>) ?? {});
      },
    },
  );

  const isLoading = isFetchingRoles || isFetchingRedirects;

  useEffect(() => {
    if (!isModalOpen || !modalData?.organizationId) return;
    void fetchRoles({ organizationId: modalData.organizationId! });
    if (modalData.memberUserId) {
      void fetchRedirects({
        userId: modalData.memberUserId,
        organizationId: modalData.organizationId!,
      });
    }
  }, [isModalOpen, modalData?.organizationId, modalData?.memberUserId]);

  const form = useForm<TUpdateMemberRoleValidationSchema>({
    resolver: zodResolver(UpdateMemberRoleValidationSchema),
    values: {
      memberId: modalData?.memberId ?? "",
      organizationId: modalData?.organizationId ?? "",
      roles: modalData?.memberRoles ?? [],
      redirectUrls: existingRedirectUrls,
    },
  });

  const { execute } = useServerAction(updateMemberRoleAction, {
    onSuccess() {
      toast.success("Member role updated successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateMemberRoleValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to update member role",
      });
    },
  });

  async function handleSubmit(values: TUpdateMemberRoleValidationSchema) {
    await execute({
      payload: values,
      transportOptions: {
        shouldRevalidate: true,
        url: `/admin/organizations/${modalData?.organizationId}`,
      },
    });
  }

  function handleClose() {
    form.reset();
    setAvailableRoles(DEFAULT_ROLES);
    setExistingRedirectUrls({});
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Member Role</DialogTitle>
          <DialogDescription>
            Change the role of <span className="font-semibold">{modalData?.memberName}</span>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-10" />
              <div className="space-y-2">
                {DEFAULT_ROLES.map((r) => (
                  <Skeleton key={r} className="h-9 w-full rounded-md" />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        ) : (
          <FormProvider {...form}>
            <UpdateMemberRoleForm
              onSubmit={handleSubmit}
              onCancel={handleClose}
              availableRoles={availableRoles}
            />
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};
