/**
 * GenerateSlotsModal — self-contained Sheet for bulk-generating Slots.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Slot (POST /slots/generate)
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * fhir-gql generates every slot in a single atomic transaction — either all
 * slots in the window are created or the action call fails outright, so the
 * only outcomes surfaced here are a success toast with generated_count, or
 * the ZSA error path via handleZSAError.
 *
 * Opens when the Zustand admin store's type === "generateSlots".
 * No props required — subscribes to the store directly.
 * Mounted once inside SlotModalProvider.
 */

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  GenerateSlotsFormSchema,
  type TGenerateSlotsFormSchema,
} from "@/modules/entities/schemas/slot";
import { generateSlotsAction } from "@/modules/server/presentation/actions/slot";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { slotKeys } from "../../queries/slot.queries";
import { GenerateSlotsForm } from "../../forms/slots/GenerateSlotsForm";

/**
 * Self-contained bulk-generate Sheet.
 * Owns the form instance and server action; delegates all field rendering to
 * GenerateSlotsForm via FormProvider.
 */
export function GenerateSlotsModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "generateSlots";

  const form = useForm<TGenerateSlotsFormSchema>({
    resolver: zodResolver(GenerateSlotsFormSchema),
    defaultValues: { overbooked: false },
  });

  function handleCloseModal() {
    form.reset();
    onClose();
  }

  const { execute, isPending } = useServerAction(generateSlotsAction, {
    onSuccess: ({ data: result }) => {
      void queryClient.invalidateQueries({ queryKey: slotKeys.all });

      toast.success(
        `Generated ${result.generated_count} slot${result.generated_count === 1 ? "" : "s"} successfully`,
      );

      form.reset();
      handleCloseModal();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to generate slots" });
    },
  });

  /**
   * Maps the flat form values to the generate API payload and executes the action.
   *
   * @param values - Validated form values from GenerateSlotsFormSchema.
   */
  async function handleSubmit(values: TGenerateSlotsFormSchema) {
    await execute({
      payload: {
        user_id: data?.userId,
        org_id: data?.orgId,
        schedule_id: values.schedule_id,
        generation_start: values.generation_start,
        generation_end: values.generation_end,
        slot_duration_minutes: values.slot_duration_minutes,
        appointment_type_system: values.appointment_type_system,
        appointment_type_code: values.appointment_type_code,
        appointment_type_display: values.appointment_type_display,
        appointment_type_text: values.appointment_type_text,
        service_category: values.service_category,
        service_type: values.service_type,
        specialty: values.specialty,
        overbooked: values.overbooked,
        comment: values.comment,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/slots",
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleCloseModal()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-lg overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Generate Slots</SheetTitle>
          <SheetDescription>
            Auto-generate one free slot per interval across a time window for
            an existing schedule. Slots are created atomically — either the
            whole window succeeds, or none of it does.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <GenerateSlotsForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
