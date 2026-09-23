/**
 * GenerateSlotsForm — field layout shell for the "Generate Slots" bulk Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Slot (bulk generation via POST /slots/generate)
 *
 * Pattern: this component does NOT own its form instance. It reads the form
 * via useFormContext() injected by the parent modal's <FormProvider>. All
 * submission logic and server action wiring live in GenerateSlotsModal.
 *
 * `schedule_id` is the fhir-gql numeric primary key — NOT a FHIR reference
 * string like every other reference field in this admin section, because
 * that's what SlotGenerateSchema actually takes. Picked via the same
 * ReferenceSelect/searchScheduleOptions combo as Add Slot's BasicTab, just
 * unwrapped to a plain number instead of a "Schedule/{id}" string.
 *
 * The 3 CodeableConcept override arrays are optional — when omitted,
 * fhir-gql auto-inherits them from the Schedule (then, for specialty, from
 * the PractitionerRole actor as a further fallback). Leaving them empty here
 * is a valid, common choice, not an error.
 *
 * Generation Start/End are constrained to the selected Schedule's planning
 * horizon (fhir-gql rejects a window outside it) via DateTimePicker's
 * min/max day matchers — mirrors the A2UI reference form's DatePicker
 * (`ai-hub/schemas/ui/generate_slots_form.json`, `fromDate`/`toDate` bound to
 * `planning_horizon_start`/`planning_horizon_end`), just with a time-of-day
 * component added since fhir-gql's SlotGenerateSchema takes full datetimes,
 * not bare dates.
 */

"use client";

import { useFormContext, useWatch, Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  FormInput,
  FormSwitch,
  FormTextarea,
} from "@/modules/client/shared/components/CustomFormFields";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { getScheduleByIdAction } from "@/modules/server/presentation/actions/schedule";
import { searchScheduleOptions } from "../../queries/schedule.queries";
import { SlotCodeableConceptRepeatableField } from "./SlotCodeableConceptRepeatableField";
import type { TGenerateSlotsFormSchema } from "@/modules/entities/schemas/slot";

/** Parses a nullable date string, returning undefined for missing/invalid input. */
function parseDateSafe(raw: string | null | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

interface GenerateSlotsFormProps {
  /**
   * Called by form.handleSubmit — receives validated TGenerateSlotsFormSchema values.
   * The modal maps these to the generate API payload.
   */
  onSubmit: (values: TGenerateSlotsFormSchema) => Promise<void>;
  /** Closes the modal when the user cancels. */
  onCancel: () => void;
  /** True while the server action is executing — disables the submit button. */
  isPending: boolean;
}

/**
 * Dumb form shell for bulk-generating slots.
 * Reads the form instance from FormProvider; renders field layout only.
 */
export function GenerateSlotsForm({
  onSubmit,
  onCancel,
  isPending,
}: GenerateSlotsFormProps) {
  const form = useFormContext<TGenerateSlotsFormSchema>();
  const scheduleId = useWatch({ control: form.control, name: "schedule_id" });

  /** Loads the selected schedule's planning horizon to bound the generation window pickers. */
  const scheduleQuery = useQuery({
    queryKey: ["schedules", "byId", scheduleId],
    queryFn: async () => {
      const [data, err] = await getScheduleByIdAction({ payload: { id: scheduleId! } });
      if (err) throw new Error(err.message ?? "Failed to load schedule");
      return data;
    },
    enabled: !!scheduleId,
    staleTime: 30_000,
  });

  const planningHorizonStart = parseDateSafe(scheduleQuery.data?.planning_horizon_start);
  const planningHorizonEnd = parseDateSafe(scheduleQuery.data?.planning_horizon_end);

  /** Decomposes the selected appointmentType CodeableConcept into its flat scalar fields. */
  function handleAppointmentTypeChange(value: string | TCodeableConcept | null) {
    if (!value || typeof value !== "object") return;
    form.setValue("appointment_type_system", value.system);
    form.setValue("appointment_type_code", value.code);
    form.setValue("appointment_type_display", value.display);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto px-4 pt-4"
    >
      <FieldGroup className="flex flex-col gap-4 pb-2">
        <Field>
          <FieldLabel>Schedule</FieldLabel>
          <Controller
            control={form.control}
            name="schedule_id"
            render={({ field }) => (
              <ReferenceSelect
                fetchOptions={searchScheduleOptions}
                queryKey={["schedules", "picker"]}
                value={
                  scheduleId
                    ? { id: scheduleId, label: form.getValues("schedule_display") ?? "" }
                    : null
                }
                onChange={(opt) => {
                  field.onChange(opt ? Number(opt.id) : undefined);
                  form.setValue("schedule_display", opt?.label ?? "");
                }}
                placeholder="Search schedules…"
              />
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Generation Start</FieldLabel>
            <Controller
              control={form.control}
              name="generation_start"
              render={({ field }) => (
                <DateTimePicker
                  value={field.value}
                  onChange={field.onChange}
                  minDate={planningHorizonStart}
                  maxDate={planningHorizonEnd}
                  disabled={!scheduleId}
                  placeholder={scheduleId ? "Pick start date & time…" : "Select a schedule first"}
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Generation End</FieldLabel>
            <Controller
              control={form.control}
              name="generation_end"
              render={({ field }) => (
                <DateTimePicker
                  value={field.value}
                  onChange={field.onChange}
                  minDate={planningHorizonStart}
                  maxDate={planningHorizonEnd}
                  disabled={!scheduleId}
                  placeholder={scheduleId ? "Pick end date & time…" : "Select a schedule first"}
                />
              )}
            />
          </Field>
        </div>
        {scheduleId && !planningHorizonStart && !planningHorizonEnd && !scheduleQuery.isFetching && (
          <p className="text-xs text-muted-foreground -mt-2">
            This schedule has no planning horizon set — any date is allowed.
          </p>
        )}

        <Field>
          <FieldLabel>Slot Duration (minutes)</FieldLabel>
          <Controller
            control={form.control}
            name="slot_duration_minutes"
            render={({ field }) => (
              <Input
                type="number"
                min={1}
                max={1440}
                value={field.value ?? ""}
                onChange={(ev) =>
                  field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                }
                placeholder="30"
              />
            )}
          />
        </Field>

        <FormSwitch control={form.control} name="overbooked" label="Overbooked" />

        <FormTextarea
          control={form.control}
          name="comment"
          label="Comment"
          placeholder="Stamped on every generated slot"
        />

        <Separator />

        <Field>
          <FieldLabel>Appointment Type</FieldLabel>
          <Controller
            control={form.control}
            name="appointment_type_code"
            render={({ field }) => (
              <TerminologySelect
                resource="Slot"
                field="appointmentType"
                valueType="codeable_concept"
                value={
                  field.value
                    ? {
                        code: field.value,
                        system: form.getValues("appointment_type_system") ?? "",
                        display: form.getValues("appointment_type_display") ?? "",
                      }
                    : null
                }
                onChange={handleAppointmentTypeChange}
                placeholder="Search appointment type…"
              />
            )}
          />
        </Field>
        <FormInput
          control={form.control}
          name="appointment_type_text"
          label="Appointment Type — Free Text"
          placeholder="Optional plain-text description"
        />

        <Separator />

        <p className="text-sm font-medium">Classification Overrides</p>
        <p className="text-xs text-muted-foreground -mt-2">
          Leave empty to auto-inherit from the Schedule (specialty falls back
          further to the PractitionerRole actor if the Schedule has none).
        </p>

        <SlotCodeableConceptRepeatableField
          control={form.control}
          name="specialty"
          terminologyField="specialty"
          description="Clinical specialty override for every generated slot."
          addLabel="Add Specialty"
          placeholder="Search specialty…"
          emptyMessage="No override — inherits from the Schedule."
        />

        <SlotCodeableConceptRepeatableField
          control={form.control}
          name="service_type"
          terminologyField="serviceType"
          description="Service type override for every generated slot."
          addLabel="Add Service Type"
          placeholder="Search service type…"
          emptyMessage="No override — inherits from the Schedule."
        />

        <SlotCodeableConceptRepeatableField
          control={form.control}
          name="service_category"
          terminologyField="serviceCategory"
          description="Service category override for every generated slot. Binding unverified."
          addLabel="Add Service Category"
          placeholder="Search service category…"
          emptyMessage="No override — inherits from the Schedule."
        />
      </FieldGroup>

      <SheetFooter className="shrink-0 px-0">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Slots
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
