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
import { updateAppAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { AppForm } from "../../forms/apps/AppForm";

export const EditAppModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "editApp";

  const form = useForm<TUpdateAppFormSchema>({
    resolver: zodResolver(UpdateAppFormSchema),
    values: {
      name: modalData?.appName ?? "",
      slug: modalData?.appSlug ?? "",
      description: modalData?.appDescription ?? "",
      isActive: modalData?.appIsActive ?? true,
    },
  });

  const { execute } = useServerAction(updateAppAction, {
    onSuccess() {
      toast.success("App updated successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateAppFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update app",
      });
    },
  });

  async function handleSubmit(values: TUpdateAppFormSchema) {
    if (!modalData?.appId) return;
    await execute({
      payload: {
        id: modalData.appId,
        name: values.name,
        slug: values.slug,
        description: values.description,
        isActive: values.isActive,
      },
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
          <DialogTitle>Edit App</DialogTitle>
          <DialogDescription>
            Update the details of{" "}
            <span className="font-medium">{modalData?.appName}</span>.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <AppForm onSubmit={handleSubmit} onCancel={handleClose} submitLabel="Save Changes" />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
