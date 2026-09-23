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
  UpdateHostFormSchema,
  TUpdateHostFormSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { UpdateHostForm } from "../../forms/agent-auth/UpdateHostForm";
import { updateHostAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const UpdateHostModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "updateHost";

  const form = useForm<TUpdateHostFormSchema>({
    resolver: zodResolver(UpdateHostFormSchema),
    values: {
      host_id: modalData?.hostId ?? "",
      name: modalData?.hostName ?? "",
      default_capabilities: (modalData?.hostDefaultCapabilities ?? []).join(", "),
      jwks_url: modalData?.hostJwksUrl ?? "",
    },
  });

  const { execute } = useServerAction(updateHostAction, {
    onSuccess() {
      toast.success("Host updated.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TUpdateHostFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update host",
      });
    },
  });

  async function handleSubmit(values: TUpdateHostFormSchema) {
    const default_capabilities = values.default_capabilities
      ? values.default_capabilities
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    await execute({
      payload: {
        host_id: values.host_id,
        name: values.name || undefined,
        default_capabilities,
        jwks_url: values.jwks_url || undefined,
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
          <DialogTitle>Edit Host</DialogTitle>
          <DialogDescription>
            Update settings for{" "}
            <span className="font-medium">
              {modalData?.hostName ?? "this host"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <UpdateHostForm onSubmit={handleSubmit} onCancel={handleCloseModal} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
