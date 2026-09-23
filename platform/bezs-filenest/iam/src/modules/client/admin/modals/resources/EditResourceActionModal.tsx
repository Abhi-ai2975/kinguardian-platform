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
  UpdateResourceActionFormSchema,
  TUpdateResourceActionFormSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { updateResourceActionAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { ResourceActionForm } from "../../forms/resources/ResourceActionForm";

export const EditResourceActionModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "editResourceAction";

  const form = useForm<TUpdateResourceActionFormSchema>({
    resolver: zodResolver(UpdateResourceActionFormSchema),
    values: {
      name: modalData?.resourceActionName ?? "",
      description: modalData?.resourceActionDescription ?? "",
      key: modalData?.resourceActionKey ?? "",
    },
  });

  const { execute } = useServerAction(updateResourceActionAction, {
    onSuccess() {
      toast.success("Resource action updated successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateResourceActionFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update resource action",
      });
    },
  });

  async function handleSubmit(values: TUpdateResourceActionFormSchema) {
    if (!modalData?.resourceActionId) return;
    await execute({
      payload: {
        id: modalData.resourceActionId,
        name: values.name,
        description: values.description || null,
        key: values.key,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/admin/resource-actions",
      },
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
          <DialogTitle>Edit Resource Action</DialogTitle>
          <DialogDescription>
            Update{" "}
            <span className="font-medium">
              {modalData?.resourceActionKey ?? "this action"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <ResourceActionForm
            onSubmit={handleSubmit}
            onCancel={handleClose}
            resources={[]}
            showResourceSelect={false}
            submitLabel="Save Changes"
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
