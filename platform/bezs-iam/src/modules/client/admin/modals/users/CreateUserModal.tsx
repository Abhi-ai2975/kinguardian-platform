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
  CreateUserFormSchema,
  TCreateUserFormSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { UserCreateForm } from "../../forms/users/UserCreateForm";
import { createUserAction } from "@/modules/server/presentation/actions/admin/users.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const CreateUserModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createUser";

  const form = useForm<TCreateUserFormSchema>({
    resolver: zodResolver(CreateUserFormSchema),
    defaultValues: { name: "", email: "", username: "", password: "", role: "guest" },
  });

  const { execute } = useServerAction(createUserAction, {
    onSuccess() {
      toast.success("User created successfully.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TCreateUserFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to create user",
      });
    },
  });

  async function handleCreateUser(values: TCreateUserFormSchema) {
    await execute({
      payload: values,
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
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Manually create a new user account.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <UserCreateForm onSubmit={handleCreateUser} onCancel={handleCloseModal} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
