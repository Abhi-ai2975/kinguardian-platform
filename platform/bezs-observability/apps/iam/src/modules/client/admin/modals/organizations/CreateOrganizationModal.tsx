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
  CreateOrganizationValidationSchema,
  TCreateOrganizationValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { createOrganizationAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { OrgCreateForm } from "../../forms/organizations/OrgCreateForm";

export const CreateOrganizationModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createOrganization";

  const form = useForm<TCreateOrganizationValidationSchema>({
    resolver: zodResolver(CreateOrganizationValidationSchema),
    defaultValues: { name: "", slug: "", logo: "", metadata: "" },
  });

  const { execute } = useServerAction(createOrganizationAction, {
    onSuccess() {
      toast.success("Organization created successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TCreateOrganizationValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to create organization",
      });
    },
  });

  async function handleSubmit(values: TCreateOrganizationValidationSchema) {
    await execute({
      payload: values,
      transportOptions: { shouldRevalidate: true, url: "/admin/organizations" },
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
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Add a new organization to the system.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <OrgCreateForm onSubmit={handleSubmit} onCancel={handleClose} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
