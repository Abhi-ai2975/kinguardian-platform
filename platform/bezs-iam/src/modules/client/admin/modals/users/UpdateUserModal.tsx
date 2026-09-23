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
  UpdateUserFormSchema,
  TUpdateUserFormSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { UserUpdateForm } from "../../forms/users/UserUpdateForm";
import { updateUserAction } from "@/modules/server/presentation/actions/admin/users.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const UpdateUserModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "updateUser";

  const form = useForm<TUpdateUserFormSchema>({
    resolver: zodResolver(UpdateUserFormSchema),
    values: {
      name: modalData?.userName ?? "",
      email: modalData?.userEmail ?? "",
      username: modalData?.userUsername ?? "",
      image: modalData?.userImage ?? "",
    },
  });

  const { execute } = useServerAction(updateUserAction, {
    onSuccess() {
      toast.success("User updated successfully.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TUpdateUserFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update user",
      });
    },
  });

  async function handleUpdate(values: TUpdateUserFormSchema) {
    if (!modalData?.userId) return;
    await execute({
      payload: {
        userId: modalData.userId,
        data: {
          name: values.name,
          email: values.email,
          username: values.username || null,
          image: values.image || null,
        },
      },
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
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update profile information for{" "}
            <span className="font-medium">{modalData?.userName ?? "this user"}</span>.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <UserUpdateForm onSubmit={handleUpdate} onCancel={handleCloseModal} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
