/**
 * CreateSlotModal — self-contained Sheet for manually creating a single Slot.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Slot
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * For bulk generation across a time window, see GenerateSlotsModal instead —
 * this modal is for one-off manual slots only.
 *
 * Opens when the Zustand admin store's type === "createSlot".
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
  CreateSlotFormSchema,
  type TCreateSlotFormSchema,
} from "@/modules/entities/schemas/slot";
import { createSlotAction } from "@/modules/server/presentation/actions/slot";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { slotKeys } from "../../queries/slot.queries";
import { CreateSlotForm } from "../../forms/slots/create-form";

/**
 * Self-contained create Sheet.
 * Owns the form instance and server action; delegates all field rendering to
 * CreateSlotForm via FormProvider.
 */
export function CreateSlotModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "createSlot";

  const form = useForm<TCreateSlotFormSchema>({
    resolver: zodResolver(CreateSlotFormSchema),
    defaultValues: { status: "free" },
  });

  function handleCloseModal() {
    form.reset();
    onClose();
  }

  const { execute, isPending } = useServerAction(createSlotAction, {
    onSuccess: () => {
      toast.success("Slot created successfully");
      void queryClient.invalidateQueries({ queryKey: slotKeys.all });
      form.reset();
      handleCloseModal();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to create slot" });
    },
  });

  /**
   * Transforms the flat form values into the API payload expected by
   * CreateSlotValidationSchema, then executes the create action.
   *
   * @param values - Validated form values from CreateSlotFormSchema.
   */
  async function handleSubmit(values: TCreateSlotFormSchema) {
    await execute({
      payload: {
        user_id: data?.userId,
        org_id: data?.orgId,
        schedule: values.schedule,
        schedule_display: values.schedule_display,
        status: values.status,
        start: values.start,
        end: values.end,
        overbooked: values.overbooked,
        comment: values.comment,
        appointment_type_system: values.appointment_type_system,
        appointment_type_code: values.appointment_type_code,
        appointment_type_display: values.appointment_type_display,
        appointment_type_text: values.appointment_type_text,
        identifier: values.identifier,
        service_category: values.service_category,
        service_type: values.service_type,
        specialty: values.specialty,
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
        className="w-full sm:max-w-2xl overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>New Slot</SheetTitle>
          <SheetDescription>
            Create a single manual slot on an existing schedule. For bulk
            creation across a time window, use Generate Slots instead.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <CreateSlotForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
