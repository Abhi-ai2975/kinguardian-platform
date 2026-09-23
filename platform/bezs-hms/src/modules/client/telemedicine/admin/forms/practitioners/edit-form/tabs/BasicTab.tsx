/**
 * BasicTab (edit) — core Practitioner scalar fields: active, gender, birth
 * date, deceased status. No `user_id` here — it's not patchable
 * (fhir-gql's PractitionerPatchDtoSchema is scalar-only and excludes it).
 */

"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { Separator } from "@/components/ui/separator";
import { FormSwitch } from "@/modules/client/shared/components/CustomFormFields";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TEditPractitionerFormSchema } from "@/modules/entities/schemas/practitioner";

/** @see EditPractitionerForm */
export function BasicTab() {
  const form = useFormContext<TEditPractitionerFormSchema>();

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <FormSwitch control={form.control} name="active" label="Active" />

      <Field>
        <FieldLabel>Gender</FieldLabel>
        <Controller
          control={form.control}
          name="gender"
          render={({ field }) => (
            <TerminologySelect
              resource="Patient"
              field="gender"
              valueType="code"
              value={field.value}
              onChange={field.onChange}
              placeholder="Select gender"
            />
          )}
        />
      </Field>

      <Field>
        <FieldLabel>Birth Date</FieldLabel>
        <Controller
          control={form.control}
          name="birth_date"
          render={({ field }) => (
            <Input {...field} value={field.value ?? ""} type="date" />
          )}
        />
      </Field>

      <Separator />

      <FormSwitch control={form.control} name="deceased_boolean" label="Deceased" />

      <Field>
        <FieldLabel>Deceased Date/Time</FieldLabel>
        <Controller
          control={form.control}
          name="deceased_datetime"
          render={({ field }) => (
            <DateTimePicker
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="Pick date & time…"
            />
          )}
        />
      </Field>
    </FieldGroup>
  );
}
