/**
 * EditScheduleForm — field layout shell for the Edit Schedule Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Schedule
 *
 * Pattern: this component does NOT own its form instance. It reads the form
 * via useFormContext() injected by the parent modal's <FormProvider>. All
 * submission logic and server action wiring live in EditScheduleModal.
 *
 * Only scalar fields patchable per the fhir-gql PATCH contract are exposed
 * (see PatchScheduleDtoSchema) — array sub-resources (identifier, specialty,
 * service_type, service_category, actor) are not editable here; delete and
 * re-create the schedule to change those.
 */

"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { FormSwitch, FormTextarea } from "@/modules/client/shared/components/CustomFormFields";
import type { TEditScheduleFormSchema } from "@/modules/entities/schemas/schedule";

interface EditScheduleFormProps {
  /**
   * Called by form.handleSubmit — receives validated TEditScheduleFormSchema values.
   * The modal maps these to the PATCH API payload.
   */
  onSubmit: (values: TEditScheduleFormSchema) => Promise<void>;
  /** Closes the modal when the user cancels. */
  onCancel: () => void;
  /** True while the server action is executing — disables the submit button. */
  isPending: boolean;
}

/**
 * Dumb form shell for editing a schedule.
 * Reads the form instance from FormProvider; renders field layout only.
 */
export function EditScheduleForm({
  onSubmit,
  onCancel,
  isPending,
}: EditScheduleFormProps) {
  const form = useFormContext<TEditScheduleFormSchema>();

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto px-4 pt-4"
    >
      <FieldGroup className="flex flex-col gap-4 pb-2">
        <FormSwitch control={form.control} name="active" label="Active" />

        <FormTextarea
          control={form.control}
          name="comment"
          label="Comment"
          placeholder="e.g. Cardiology OPD — Dr. Smith, Mon/Wed/Fri"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Planning Horizon Start</FieldLabel>
            <Controller
              control={form.control}
              name="planning_horizon_start"
              render={({ field }) => (
                <DateTimePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick start date & time…"
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Planning Horizon End</FieldLabel>
            <Controller
              control={form.control}
              name="planning_horizon_end"
              render={({ field }) => (
                <DateTimePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick end date & time…"
                />
              )}
            />
          </Field>
        </div>
      </FieldGroup>

      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
