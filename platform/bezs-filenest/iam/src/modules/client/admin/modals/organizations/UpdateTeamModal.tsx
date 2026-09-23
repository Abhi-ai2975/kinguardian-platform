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
  UpdateTeamValidationSchema,
  TUpdateTeamValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { updateTeamAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { TeamForm } from "../../forms/organizations/TeamForm";

export const UpdateTeamModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "updateTeam";

  const form = useForm<TUpdateTeamValidationSchema>({
    resolver: zodResolver(UpdateTeamValidationSchema),
    values: {
      teamId: modalData?.teamId ?? "",
      organizationId: modalData?.organizationId ?? "",
      name: modalData?.teamName ?? "",
    },
  });

  const { execute } = useServerAction(updateTeamAction, {
    onSuccess() {
      toast.success("Team updated successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TUpdateTeamValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to update team",
      });
    },
  });

  async function handleSubmit(values: TUpdateTeamValidationSchema) {
    await execute({
      payload: values,
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
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>Rename this team.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <TeamForm onSubmit={handleSubmit} onCancel={handleClose} isEdit />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
