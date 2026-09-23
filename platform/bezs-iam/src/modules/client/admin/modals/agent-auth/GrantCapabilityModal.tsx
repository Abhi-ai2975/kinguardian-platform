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
  GrantCapabilityFormSchema,
  TGrantCapabilityFormSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { GrantCapabilityForm } from "../../forms/agent-auth/GrantCapabilityForm";
import { grantAgentCapabilityAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const GrantCapabilityModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "grantAgentCapability";

  const form = useForm<TGrantCapabilityFormSchema>({
    resolver: zodResolver(GrantCapabilityFormSchema),
    defaultValues: {
      agent_id: "",
      capabilities: "",
      ttl: undefined,
    },
  });

  const { execute } = useServerAction(grantAgentCapabilityAction, {
    onSuccess() {
      toast.success("Capabilities granted.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TGrantCapabilityFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to grant capabilities",
      });
    },
  });

  async function handleSubmit(values: TGrantCapabilityFormSchema) {
    const capabilities = values.capabilities
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    await execute({
      payload: {
        agent_id: modalData?.agentId ?? values.agent_id,
        capabilities,
        ttl: values.ttl,
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
          <DialogTitle>Grant Capabilities</DialogTitle>
          <DialogDescription>
            Grant capabilities to{" "}
            <span className="font-medium">
              {modalData?.agentName ?? "this agent"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <GrantCapabilityForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
