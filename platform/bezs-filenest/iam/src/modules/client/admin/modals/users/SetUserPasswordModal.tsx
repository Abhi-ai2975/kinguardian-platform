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
  SetUserPasswordFormSchema,
  TSetUserPasswordFormSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { UserSetPasswordForm } from "../../forms/users/UserSetPasswordForm";
import { setUserPasswordAction } from "@/modules/server/presentation/actions/admin/users.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const SetUserPasswordModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "setUserPassword";

  const form = useForm<TSetUserPasswordFormSchema>({
    resolver: zodResolver(SetUserPasswordFormSchema),
  });

  const { execute } = useServerAction(setUserPasswordAction, {
    onSuccess() {
      toast.success("Password updated successfully.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TSetUserPasswordFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update password",
      });
    },
  });

  async function handleSetPassword(values: TSetUserPasswordFormSchema) {
    if (!modalData?.userId) return;
    await execute({
      payload: { userId: modalData.userId, newPassword: values.newPassword },
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
          <DialogTitle>Set Password</DialogTitle>
          <DialogDescription>
            Set a new password for{" "}
            <span className="font-medium">{modalData?.userName ?? "this user"}</span>.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <UserSetPasswordForm onSubmit={handleSetPassword} onCancel={handleCloseModal} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
