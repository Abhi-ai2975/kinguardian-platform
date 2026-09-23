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
  CreateInvitationValidationSchema,
  TCreateInvitationValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { createInvitationAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { CreateInvitationForm } from "../../forms/organizations/CreateInvitationForm";

export const CreateInvitationModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "createInvitation";

  const form = useForm<TCreateInvitationValidationSchema>({
    resolver: zodResolver(CreateInvitationValidationSchema),
    defaultValues: { organizationId: modalData?.organizationId ?? "", email: "", role: "member" },
  });

  const { execute } = useServerAction(createInvitationAction, {
    onSuccess() {
      toast.success("Invitation sent successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TCreateInvitationValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to send invitation",
      });
    },
  });

  async function handleSubmit(values: TCreateInvitationValidationSchema) {
    await execute({
      payload: { ...values, organizationId: modalData?.organizationId ?? values.organizationId },
      transportOptions: {
        shouldRevalidate: true,
        url: `/admin/organizations/${modalData?.organizationId}`,
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
          <DialogTitle>Send Invitation</DialogTitle>
          <DialogDescription>Invite a user to join this organization.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <CreateInvitationForm onSubmit={handleSubmit} onCancel={handleClose} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
