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
  UpdateAgentFormSchema,
  TUpdateAgentFormSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { UpdateAgentForm } from "../../forms/agent-auth/UpdateAgentForm";
import { updateAgentAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const UpdateAgentModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "updateAgent";

  const form = useForm<TUpdateAgentFormSchema>({
    resolver: zodResolver(UpdateAgentFormSchema),
    values: {
      agent_id: modalData?.agentId ?? "",
      name: modalData?.agentName ?? "",
      metadata: "",
    },
  });

  const { execute } = useServerAction(updateAgentAction, {
    onSuccess() {
      toast.success("Agent updated.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TUpdateAgentFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update agent",
      });
    },
  });

  async function handleSubmit(values: TUpdateAgentFormSchema) {
    let metadata: Record<string, string | number | boolean | null> | undefined;

    if (values.metadata?.trim()) {
      try {
        metadata = JSON.parse(values.metadata);
      } catch {
        form.setError("metadata", { message: "Invalid JSON" });
        return;
      }
    }

    await execute({
      payload: {
        agent_id: values.agent_id,
        name: values.name,
        metadata,
      },
      transportOptions: { shouldRevalidate: true, url: "/admin/agent-auth" },
    });
  }

  function handleCloseModal() {
    form.reset();
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update the name or metadata for{" "}
            <span className="font-medium">
              {modalData?.agentName ?? "this agent"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <UpdateAgentForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
