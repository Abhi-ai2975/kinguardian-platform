"use client";

import { useEffect, useState } from "react";
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
import {
  SetUserContextValidationSchema,
  TSetUserContextValidationSchema,
  TUserOrgMembershipSchema,
  TOrgRoleForContextSchema,
} from "@/modules/entities/schemas/admin/user-context/user-context.schema";
import { SetUserContextForm } from "../../forms/user-context/SetUserContextForm";
import {
  getUserOrgMembershipsAction,
  getOrgRolesForContextAction,
  setUserContextAction,
} from "@/modules/server/presentation/actions/admin/user-context.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const SetUserContextModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "setUserContext";

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const form = useForm<TSetUserContextValidationSchema>({
    resolver: zodResolver(SetUserContextValidationSchema),
    defaultValues: {
      userId: "",
      activeOrganizationId: "",
      activeRoleId: "",
    },
  });

  const {
    execute: fetchMemberships,
    isPending: isFetchingMemberships,
    data: memberships,
  } = useServerAction(getUserOrgMembershipsAction, {
    onError({ err }) {
      toast.error(err.message || "Failed to load organization memberships");
    },
  });

  const {
    execute: fetchOrgRoles,
    isPending: isFetchingRoles,
    data: orgRoles,
    reset: resetOrgRoles,
  } = useServerAction(getOrgRolesForContextAction, {
    onError({ err }) {
      toast.error(err.message || "Failed to load roles");
    },
  });

  const { execute: submitSetContext } = useServerAction(setUserContextAction, {
    onSuccess() {
      toast.success("User context updated successfully.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TSetUserContextValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to update user context",
      });
    },
  });

  useEffect(() => {
    if (isModalOpen && modalData?.userContextUserId) {
      const existingOrgId = modalData.userContextActiveOrganizationId ?? null;
      const existingRoleId = modalData.userContextActiveRoleId ?? null;

      form.reset({
        userId: modalData.userContextUserId,
        activeOrganizationId: existingOrgId ?? "",
        activeRoleId: existingRoleId ?? "",
      });

      setSelectedOrgId(existingOrgId);
      setSelectedRoleId(existingRoleId);

      fetchMemberships({ userId: modalData.userContextUserId });

      if (existingOrgId) {
        fetchOrgRoles({ organizationId: existingOrgId });
      } else {
        resetOrgRoles();
      }
    }
  }, [isModalOpen, modalData?.userContextUserId]);

  function handleOrgSelect(orgId: string) {
    setSelectedOrgId(orgId);
    form.setValue("activeOrganizationId", orgId, { shouldValidate: true });
    form.setValue("activeRoleId", "", { shouldValidate: false });
    setSelectedRoleId(null);
    fetchOrgRoles({ organizationId: orgId });
  }

  function handleRoleSelect(roleId: string) {
    setSelectedRoleId(roleId);
    form.setValue("activeRoleId", roleId, { shouldValidate: true });
  }

  async function handleSetContext(values: TSetUserContextValidationSchema) {
    await submitSetContext({
      payload: values,
      transportOptions: { shouldRevalidate: true, url: "/admin/user-context" },
    });
  }

  function handleCloseModal() {
    form.reset();
    setSelectedOrgId(null);
    setSelectedRoleId(null);
    closeModal();
  }

  const membershipList: TUserOrgMembershipSchema[] = memberships ?? [];
  const orgRoleList: TOrgRoleForContextSchema[] = orgRoles ?? [];

  return (
    <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set User Context</DialogTitle>
          <DialogDescription>
            Set the active organization and role for{" "}
            <span className="font-medium">
              {modalData?.userContextUserName ?? "this user"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {isFetchingMemberships ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        ) : (
          <FormProvider {...form}>
            <SetUserContextForm
              onSubmit={handleSetContext}
              onCancel={handleCloseModal}
              memberships={membershipList}
              orgRoles={orgRoleList}
              isFetchingRoles={isFetchingRoles}
              selectedOrgId={selectedOrgId}
              selectedRoleId={selectedRoleId}
              onOrgSelect={handleOrgSelect}
              onRoleSelect={handleRoleSelect}
            />
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};
