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
  UpdateOrganizationValidationSchema,
  TUpdateOrganizationValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { updateOrganizationAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { OrgEditForm } from "../../forms/organizations/OrgEditForm";

export const EditOrganizationModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "editOrganization";

  const form = useForm<TUpdateOrganizationValidationSchema>({
    resolver: zodResolver(UpdateOrganizationValidationSchema),
    values: {
      organizationId: modalData?.organizationId ?? "",
      name: modalData?.organizationName ?? "",
      slug: modalData?.organizationSlug ?? "",
      logo: modalData?.organizationLogo ?? "",
      metadata: modalData?.organizationMetadata ?? "",
    },
  });

  const { execute } = useServerAction(updateOrganizationAction, {
    onSuccess() {
      toast.success("Organization updated successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateOrganizationValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to update organization",
      });
    },
  });

  async function handleSubmit(values: TUpdateOrganizationValidationSchema) {
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
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>Update the details of {modalData?.organizationName}.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <OrgEditForm onSubmit={handleSubmit} onCancel={handleClose} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
