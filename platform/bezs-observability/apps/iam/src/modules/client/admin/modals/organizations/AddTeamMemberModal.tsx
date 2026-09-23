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
  AddTeamMemberValidationSchema,
  TAddTeamMemberValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { addTeamMemberAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { AddTeamMemberForm } from "../../forms/organizations/AddTeamMemberForm";

export const AddTeamMemberModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "addTeamMember";

  const form = useForm<TAddTeamMemberValidationSchema>({
    resolver: zodResolver(AddTeamMemberValidationSchema),
    defaultValues: {
      teamId: modalData?.teamId ?? "",
      organizationId: modalData?.organizationId ?? "",
      email: "",
    },
  });

  const { execute } = useServerAction(addTeamMemberAction, {
    onSuccess() {
      toast.success("Member added to team.");
      handleClose();
    },
    onError({ err }) {
      handleZSAError<TAddTeamMemberValidationSchema>({
        err,
        form,
        fallbackMessage: "Failed to add team member",
      });
    },
  });

  async function handleSubmit(values: TAddTeamMemberValidationSchema) {
    await execute({
      payload: {
        ...values,
        teamId: modalData?.teamId ?? values.teamId,
        organizationId: modalData?.organizationId ?? values.organizationId,
      },
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
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a user to <span className="font-semibold">{modalData?.teamName}</span>.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <AddTeamMemberForm onSubmit={handleSubmit} onCancel={handleClose} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
