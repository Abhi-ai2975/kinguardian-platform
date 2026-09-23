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
  UpdateResourceFormSchema,
  TUpdateResourceFormSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { updateResourceAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { ResourceForm } from "../../forms/resources/ResourceForm";

export const EditResourceModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "editResource";

  const form = useForm<TUpdateResourceFormSchema>({
    resolver: zodResolver(UpdateResourceFormSchema),
    values: {
      name: modalData?.resourceName ?? "",
      description: modalData?.resourceDescription ?? "",
    },
  });

  const { execute } = useServerAction(updateResourceAction, {
    onSuccess() {
      toast.success("Resource updated successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateResourceFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update resource",
      });
    },
  });

  async function handleSubmit(values: TUpdateResourceFormSchema) {
    if (!modalData?.resourceId) return;
    await execute({
      payload: {
        id: modalData.resourceId,
        name: values.name,
        description: values.description || null,
      },
      transportOptions: { shouldRevalidate: true, url: "/admin/resources" },
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
          <DialogTitle>Edit Resource</DialogTitle>
          <DialogDescription>
            Update{" "}
            <span className="font-medium">{modalData?.resourceName}</span>.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <ResourceForm
            onSubmit={handleSubmit}
            onCancel={handleClose}
            submitLabel="Save Changes"
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
