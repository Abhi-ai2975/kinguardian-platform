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
  CreateTeamValidationSchema,
  TCreateTeamValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { createTeamAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { TeamForm } from "../../forms/organizations/TeamForm";

export const CreateTeamModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "createTeam";

  const form = useForm<TCreateTeamValidationSchema>({
    resolver: zodResolver(CreateTeamValidationSchema),
    defaultValues: { organizationId: modalData?.organizationId ?? "", name: "" },
  });

  const { execute } = useServerAction(createTeamAction, {
    onSuccess() {
      toast.success("Team created successfully.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TCreateTeamValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to create team",
      });
    },
  });

  async function handleSubmit(values: TCreateTeamValidationSchema) {
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
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>Add a new team to this organization.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <TeamForm onSubmit={handleSubmit} onCancel={handleClose} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
