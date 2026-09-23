/**
 * BasicTab — core Slot fields: schedule reference, status, window, overbooked,
 * comment, appointment type.
 *
 * `status` is a plain hardcoded Select (not TerminologySelect) — no evidence
 * of a terminology binding for Slot.status in any A2UI reference form; the
 * FHIR R4 value set is small and fixed, so a wrong terminology guess (a
 * silently empty dropdown) is worse than hardcoding it. See SlotStatusSchema.
 *
 * `appointment_type` IS TerminologySelect-backed — confirmed via
 * generate_slots_form.json (resource="Slot" field="appointmentType").
 */

"use client";

import { useFormContext, useWatch, Controller } from "react-hook-form";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { SLOT_STATUS_OPTIONS } from "../../../../components/slots/SlotsTableColumn";
import { searchScheduleOptions } from "../../../../queries/schedule.queries";
import type { TCreateSlotFormSchema } from "@/modules/entities/schemas/slot";

/** Renders the Basic tab content — no props needed, reads form via useFormContext. */
export function BasicTab() {
  const form = useFormContext<TCreateSlotFormSchema>();
  const schedule = useWatch({ control: form.control, name: "schedule" });

  /** Decomposes the selected appointmentType CodeableConcept into its flat scalar fields. */
  function handleAppointmentTypeChange(value: string | TCodeableConcept | null) {
    if (!value || typeof value !== "object") return;
    form.setValue("appointment_type_system", value.system);
    form.setValue("appointment_type_code", value.code);
    form.setValue("appointment_type_display", value.display);
  }

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Schedule</FieldLabel>
          <Controller
            control={form.control}
            name="schedule"
            render={({ field }) => {
              const id = schedule ? Number(schedule.split("/")[1]) : undefined;
              return (
                <ReferenceSelect
                  fetchOptions={searchScheduleOptions}
                  queryKey={["schedules", "picker"]}
                  value={id ? { id, label: form.getValues("schedule_display") ?? "" } : null}
                  onChange={(opt) => {
                    field.onChange(opt ? `Schedule/${opt.id}` : "");
                    form.setValue("schedule_display", opt?.label ?? "");
                  }}
                  placeholder="Search schedules…"
                />
              );
            }}
          />
        </Field>
        <FormInput
          control={form.control}
          name="schedule_display"
          label="Schedule Display"
          placeholder="Cardiology OPD"
          description="Auto-filled from your selection — you can still edit it."
        />
      </div>

      <Field>
        <FieldLabel>Status</FieldLabel>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {SLOT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Start</FieldLabel>
          <Controller
            control={form.control}
            name="start"
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
          <FieldLabel>End</FieldLabel>
          <Controller
            control={form.control}
            name="end"
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

      <FormSwitch control={form.control} name="overbooked" label="Overbooked" />

      <FormTextarea
        control={form.control}
        name="comment"
        label="Comment"
        placeholder="Optional free-text comment"
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
    </FieldGroup>
  );
}
