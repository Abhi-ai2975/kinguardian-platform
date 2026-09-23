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
  UpdatePreferenceTemplateFormSchema,
  TUpdatePreferenceTemplateFormSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { updatePreferenceTemplateAction } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { PreferenceTemplateFields } from "../../forms/preference-templates/PreferenceTemplateFields";

export const UpdatePreferenceTemplateModal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "editPreferenceTemplate";

  // Use `values` so form re-syncs whenever modalData changes (different row clicked)
  const form = useForm<TUpdatePreferenceTemplateFormSchema>({
    resolver: zodResolver(UpdatePreferenceTemplateFormSchema),
    values: {
      scope: (modalData?.preferenceTemplateScope as "GLOBAL" | "COUNTRY") ?? "GLOBAL",
      country: modalData?.preferenceTemplateCountry ?? "",
      timezone: modalData?.preferenceTemplateTimezone ?? "UTC",
      dateFormat: modalData?.preferenceTemplateDateFormat ?? "DD/MM/YYYY",
      timeFormat: modalData?.preferenceTemplateTimeFormat ?? "HH:mm",
      currency: modalData?.preferenceTemplateCurrency ?? "USD",
      numberFormat: modalData?.preferenceTemplateNumberFormat ?? "1,234.56",
      weekStart: modalData?.preferenceTemplateWeekStart ?? "monday",
    },
  });

  const { execute, isPending } = useServerAction(
    updatePreferenceTemplateAction,
    {
      onSuccess() {
        toast.success("Preference template updated.");
        closeModal();
      },
      onError({ err }) {
        handleZSAError<TUpdatePreferenceTemplateFormSchema>({
          err,
          form,
          fallbackMessage: "Failed to update preference template",
        });
      },
    },
  );

  async function handleSubmit(values: TUpdatePreferenceTemplateFormSchema) {
    if (!modalData?.preferenceTemplateId) return;

    await execute({
      payload: { ...values, id: modalData.preferenceTemplateId },
      transportOptions: {
        shouldRevalidate: true,
        url: "/admin/preference-templates",
      },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Preference Template</DialogTitle>
          <DialogDescription>
            Update the locale settings for this template.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <PreferenceTemplateFields />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
