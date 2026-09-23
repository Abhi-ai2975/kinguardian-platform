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
  UpdateAppFormSchema,
  TUpdateAppFormSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import { createAppAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { AppForm } from "../../forms/apps/AppForm";

export const CreateAppModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createApp";

  const form = useForm<TUpdateAppFormSchema>({
    resolver: zodResolver(UpdateAppFormSchema),
    defaultValues: { name: "", slug: "", description: "", isActive: true },
  });

  const { execute } = useServerAction(createAppAction, {
    onSuccess() {
      toast.success("App created successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateAppFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to create app",
      });
    },
  });

  async function handleSubmit(values: TUpdateAppFormSchema) {
    await execute({
      payload: values,
      transportOptions: { shouldRevalidate: true, url: "/admin/apps" },
    });
  }

  function handleClose() {
    form.reset();
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create App</DialogTitle>
          <DialogDescription>Add a new application to the system.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <AppForm onSubmit={handleSubmit} onCancel={handleClose} submitLabel="Create App" />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
