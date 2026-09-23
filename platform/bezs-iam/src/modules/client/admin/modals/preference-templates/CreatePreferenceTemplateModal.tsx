"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreatePreferenceTemplateFormSchema,
  TCreatePreferenceTemplateFormSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { createPreferenceTemplateAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { PreferenceTemplateFields } from "../../forms/preference-templates/PreferenceTemplateFields";

export const CreatePreferenceTemplateModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "createPreferenceTemplate";

  const form = useForm<TCreatePreferenceTemplateFormSchema>({
    resolver: zodResolver(CreatePreferenceTemplateFormSchema),
    defaultValues: {
      scope: "GLOBAL",
      country: "",
      timezone: "UTC",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "HH:mm",
      currency: "USD",
      numberFormat: "1,234.56",
      weekStart: "monday",
    },
  });

  const { execute, isPending } = useServerAction(
    createPreferenceTemplateAction,
    {
      onSuccess() {
        toast.success("Preference template created.");
        handleClose();
      },
      onError({ err }) {
        handleZSAError<TCreatePreferenceTemplateFormSchema>({
          err,
          form,
          fallbackMessage: "Failed to create preference template",
        });
      },
    },
  );

  async function handleSubmit(values: TCreatePreferenceTemplateFormSchema) {
    await execute({
      payload: values,
      transportOptions: {
        shouldRevalidate: true,
        url: "/admin/preference-templates",
      },
    });
  }

  function handleClose() {
    form.reset();
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Preference Template</DialogTitle>
          <DialogDescription>
            Define default locale settings for Global or Country-specific
            templates. Only one Global template can exist.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <PreferenceTemplateFields />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
