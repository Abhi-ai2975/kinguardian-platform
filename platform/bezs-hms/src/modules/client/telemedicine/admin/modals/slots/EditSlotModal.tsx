/**
 * EditSlotModal — self-contained Sheet for editing a Slot.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Slot
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Opens when the Zustand admin store's type === "editSlot".
 * The store's `data.slot` field carries the full slot record used to
 * pre-populate the form. No props required.
 * Mounted once inside SlotModalProvider.
 */

"use client";

import { useEffect } from "react";
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
  EditSlotFormSchema,
  type TEditSlotFormSchema,
  type TSlotResponse,
} from "@/modules/entities/schemas/slot";
import { updateSlotAction } from "@/modules/server/presentation/actions/slot";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { slotKeys } from "../../queries/slot.queries";
import { EditSlotForm } from "../../forms/slots/EditSlotForm";

/** Maps a slot record onto the flat edit form's default values. */
function toFormValues(slot: TSlotResponse | undefined): TEditSlotFormSchema {
  return {
    status: (slot?.status as TEditSlotFormSchema["status"]) ?? undefined,
    start: slot?.start ?? "",
    end: slot?.end ?? "",
    overbooked: slot?.overbooked ?? undefined,
    comment: slot?.comment ?? "",
    appointment_type_system: slot?.appointment_type_system ?? "",
    appointment_type_code: slot?.appointment_type_code ?? "",
    appointment_type_display: slot?.appointment_type_display ?? "",
    appointment_type_text: slot?.appointment_type_text ?? "",
  };
}

/**
 * Self-contained edit Sheet.
 * Owns the form instance and server action; delegates field rendering to
 * EditSlotForm via FormProvider.
 */
export function EditSlotModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "editSlot";
  const slot = data?.slot;

  const form = useForm<TEditSlotFormSchema>({
    resolver: zodResolver(EditSlotFormSchema),
    defaultValues: toFormValues(slot),
  });

  /**
   * Re-populate the form whenever a different slot is opened for editing.
   * Without this reset, stale values from a previously edited record would
   * remain in the form when the user opens another slot.
   */
  useEffect(() => {
    if (open && slot) {
      form.reset(toFormValues(slot));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slot?.id]);

  const { execute, isPending } = useServerAction(updateSlotAction, {
    onSuccess: () => {
      toast.success("Slot updated successfully");
      void queryClient.invalidateQueries({ queryKey: slotKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to update slot" });
    },
  });

  /**
   * Maps the flat form values to the API PATCH payload and executes the action.
   *
   * @param values - Validated form values from EditSlotFormSchema.
   */
  async function handleSubmit(values: TEditSlotFormSchema) {
    if (!slot?.id) return;
    await execute({
      payload: {
        id: slot.id,
        status: values.status,
        start: values.start || undefined,
        end: values.end || undefined,
        overbooked: values.overbooked,
        comment: values.comment || undefined,
        appointment_type_system: values.appointment_type_system || undefined,
        appointment_type_code: values.appointment_type_code || undefined,
        appointment_type_display: values.appointment_type_display || undefined,
        appointment_type_text: values.appointment_type_text || undefined,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/slots",
      },
    });
  }

  if (!open || !slot) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-lg overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Edit Slot</SheetTitle>
          <SheetDescription>
            Update scalar fields. The schedule reference and sub-resource
            arrays (identifiers, specialty, service type, service category)
            require delete and re-create.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <EditSlotForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
