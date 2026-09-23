/**
 * EditScheduleModal — self-contained Sheet for editing a Schedule.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Schedule
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * Opens when the Zustand admin store's type === "editSchedule".
 * The store's `data.schedule` field carries the full schedule record used to
 * pre-populate the form. No props required.
 * Mounted once inside ScheduleModalProvider.
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
  EditScheduleFormSchema,
  type TEditScheduleFormSchema,
  type TScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { updateScheduleAction } from "@/modules/server/presentation/actions/schedule";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { scheduleKeys } from "../../queries/schedule.queries";
import { EditScheduleForm } from "../../forms/schedules/EditScheduleForm";

/** Maps a schedule record onto the flat edit form's default values. */
function toFormValues(schedule: TScheduleResponse | undefined): TEditScheduleFormSchema {
  return {
    active: schedule?.active ?? undefined,
    comment: schedule?.comment ?? "",
    planning_horizon_start: schedule?.planning_horizon_start ?? "",
    planning_horizon_end: schedule?.planning_horizon_end ?? "",
  };
}

/**
 * Self-contained edit Sheet.
 * Owns the form instance and server action; delegates field rendering to
 * EditScheduleForm via FormProvider.
 */
export function EditScheduleModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "editSchedule";
  const schedule = data?.schedule;

  const form = useForm<TEditScheduleFormSchema>({
    resolver: zodResolver(EditScheduleFormSchema),
    defaultValues: toFormValues(schedule),
  });

  /**
   * Re-populate the form whenever a different schedule is opened for editing.
   * Without this reset, stale values from a previously edited record would
   * remain in the form when the user opens another schedule.
   */
  useEffect(() => {
    if (open && schedule) {
      form.reset(toFormValues(schedule));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schedule?.id]);

  const { execute, isPending } = useServerAction(updateScheduleAction, {
    onSuccess: () => {
      toast.success("Schedule updated successfully");
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to update schedule" });
    },
  });

  /**
   * Maps the flat form values to the API PATCH payload and executes the action.
   *
   * @param values - Validated form values from EditScheduleFormSchema.
   */
  async function handleSubmit(values: TEditScheduleFormSchema) {
    if (!schedule?.id) return;
    await execute({
      payload: {
        id: schedule.id,
        active: values.active,
        comment: values.comment || undefined,
        planning_horizon_start: values.planning_horizon_start || undefined,
        planning_horizon_end: values.planning_horizon_end || undefined,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/schedules",
      },
    });
  }

  if (!open || !schedule) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={1200}
        className="w-full sm:max-w-lg overflow-hidden flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Edit Schedule</SheetTitle>
          <SheetDescription>
            Update scalar fields. Sub-resource arrays (identifier, specialty,
            service type, service category, actors) require delete and re-create.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <EditScheduleForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
