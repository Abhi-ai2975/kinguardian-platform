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
  UpdateConsentScopesFormSchema,
  TUpdateConsentScopesFormSchema,
} from "@/modules/entities/schemas/admin/consents/consents.schema";
import { UpdateConsentScopesForm } from "../../forms/consents/UpdateConsentScopesForm";
import { updateConsentScopesAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const UpdateConsentScopesModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "updateConsentScopes";

  const form = useForm<TUpdateConsentScopesFormSchema>({
    resolver: zodResolver(UpdateConsentScopesFormSchema),
    values: {
      id: modalData?.consentId ?? "",
      scopes: modalData?.consentScopes ?? [],
    },
  });

  const { execute } = useServerAction(updateConsentScopesAction, {
    onSuccess() {
      toast.success("Consent scopes updated.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TUpdateConsentScopesFormSchema>({
        err,
        form,
        fallbackMessage: "Failed to update consent scopes",
      });
    },
  });

  async function handleUpdate(values: TUpdateConsentScopesFormSchema) {
    const cleanedScopes = values.scopes.map((s) => s.trim()).filter(Boolean);
    await execute({
      payload: { ...values, scopes: cleanedScopes },
      transportOptions: { shouldRevalidate: true, url: "/admin/consents" },
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
          <DialogTitle>Edit Consent Scopes</DialogTitle>
          <DialogDescription>
            Editing scopes for consent{" "}
            <span className="font-mono text-xs">{modalData?.consentId}</span>.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <UpdateConsentScopesForm
            onSubmit={handleUpdate}
            onCancel={handleCloseModal}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
