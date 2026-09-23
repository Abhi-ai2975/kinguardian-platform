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
  CreateResourceFormSchema,
  TCreateResourceFormSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { createResourceAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { ResourceForm } from "../../forms/resources/ResourceForm";

export const CreateResourceModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createResource";

  const form = useForm<TCreateResourceFormSchema>({
    resolver: zodResolver(CreateResourceFormSchema),
    defaultValues: { name: "", description: "" },
  });

  const { execute } = useServerAction(createResourceAction, {
    onSuccess() {
      toast.success("Resource created successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TCreateResourceFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to create resource",
      });
    },
  });

  async function handleSubmit(values: TCreateResourceFormSchema) {
    await execute({
      payload: {
        name: values.name,
        description: values.description || undefined,
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
          <DialogTitle>Create Resource</DialogTitle>
          <DialogDescription>
            Add a new resource to the permission system.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <ResourceForm
            onSubmit={handleSubmit}
            onCancel={handleClose}
            submitLabel="Create Resource"
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
