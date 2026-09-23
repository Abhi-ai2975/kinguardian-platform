"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SetUserRoleFormSchema,
  TSetUserRoleFormSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { UserSetRoleForm } from "../../forms/users/UserSetRoleForm";
import { setUserRoleAction } from "@/modules/server/presentation/actions/admin/users.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const SetRoleModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "setRole";

  const form = useForm<TSetUserRoleFormSchema>({
    resolver: zodResolver(SetUserRoleFormSchema),
    values: {
      role: (modalData?.currentRole as TSetUserRoleFormSchema["role"]) ?? "guest",
    },
  });

  const { execute } = useServerAction(setUserRoleAction, {
    onSuccess() {
      toast.success("Role updated successfully.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TSetUserRoleFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update role",
      });
    },
  });

  async function handleSetRole(values: TSetUserRoleFormSchema) {
    if (!modalData?.userId) return;
    await execute({
      payload: { userId: modalData.userId, role: values.role },
      transportOptions: { shouldRevalidate: true, url: "/admin/users" },
    });
  }

  function handleCloseModal() {
    form.reset();
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Role</DialogTitle>
          <DialogDescription>
            Change the role for{" "}
            <span className="font-medium">{modalData?.userName ?? "this user"}</span>.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <UserSetRoleForm onSubmit={handleSetRole} onCancel={handleCloseModal} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
