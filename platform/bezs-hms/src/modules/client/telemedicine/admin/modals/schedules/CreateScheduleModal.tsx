/**
 * CreateScheduleModal — self-contained Sheet for creating a Schedule.
 *
 * Layer: client / telemedicine / admin / modals
 * Resource: Schedule
 *
 * Pattern: the modal owns the form instance (useForm + FormProvider) and the
 * server action (useServerAction). The form component is a dumb shell that
 * reads from FormProvider via useFormContext() and renders field layout only.
 *
 * handleSubmit responsibilities:
 *  - user_id/org_id are optional for Schedule (unlike Location) — stamped
 *    from the session when present, matching Organization's pattern.
 *  - Concatenate the 3 actor sub-groups (practitioner_roles, locations,
 *    healthcare_services) into one actor[] array, since the real API only
 *    accepts a single flat actor[] field — the 3-way split exists purely for
 *    UX clarity in the Actors tab.
 *
 * Opens when the Zustand admin store's type === "createSchedule".
 * No props required — subscribes to the store directly.
 * Mounted once inside ScheduleModalProvider.
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
  CreateScheduleFormSchema,
  type TCreateScheduleFormSchema,
} from "@/modules/entities/schemas/schedule";
import { createScheduleAction } from "@/modules/server/presentation/actions/schedule";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { useAdminStore } from "../../stores/admin.store";
import { scheduleKeys } from "../../queries/schedule.queries";
import { CreateScheduleForm } from "../../forms/schedules/create-form";

/**
 * Self-contained create Sheet.
 * Owns the form instance and server action; delegates all field rendering to
 * CreateScheduleForm via FormProvider.
 */
export function CreateScheduleModal() {
  const isOpen = useAdminStore((s) => s.isOpen);
  const type = useAdminStore((s) => s.type);
  const data = useAdminStore((s) => s.data);
  const onClose = useAdminStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "createSchedule";

  const form = useForm<TCreateScheduleFormSchema>({
    resolver: zodResolver(CreateScheduleFormSchema),
    defaultValues: { active: true },
  });

  function handleCloseModal() {
    form.reset();
    onClose();
  }

  const { execute, isPending } = useServerAction(createScheduleAction, {
    onSuccess: () => {
      toast.success("Schedule created successfully");
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      form.reset();
      handleCloseModal();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to create schedule" });
    },
  });

  /**
   * Transforms the flat form values into the nested API payload expected by
   * CreateScheduleValidationSchema, then executes the create action.
   *
   * @param values - Validated form values from CreateScheduleFormSchema.
   */
  async function handleSubmit(values: TCreateScheduleFormSchema) {
    const actor = [
      ...(values.practitioner_roles ?? []),
      ...(values.locations ?? []),
      ...(values.healthcare_services ?? []),
    ];

    await execute({
      payload: {
        user_id: data?.userId,
        org_id: data?.orgId,
        active: values.active,
        comment: values.comment,
        planning_horizon_start: values.planning_horizon_start,
        planning_horizon_end: values.planning_horizon_end,
        identifier: values.identifier,
        service_category: values.service_category,
        service_type: values.service_type,
        specialty: values.specialty,
        actor: actor.length > 0 ? actor : undefined,
      },
      transportOptions: {
        shouldRevalidate: true,
        url: "/telemedicine/admin/schedules",
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
          <SheetTitle>New Schedule</SheetTitle>
          <SheetDescription>
            Create a new schedule in the FHIR server. All fields are optional
            except the tenant context stamped automatically from your session.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <CreateScheduleForm
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isPending={isPending}
          />
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
