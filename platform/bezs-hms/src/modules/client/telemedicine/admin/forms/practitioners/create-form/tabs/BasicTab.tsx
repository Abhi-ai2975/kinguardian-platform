/**
 * BasicTab — core Practitioner fields: user_id, active, gender, birth date,
 * deceased status.
 *
 * `user_id` is a REQUIRED, visible picker (not silently stamped from the
 * session like every other resource) — an admin creating a Practitioner
 * record is linking it to a specific person's IAM login account. Searches
 * the org's "doctor"-role members via `searchDoctorUserOptions`, which
 * forwards to the sibling IAM app's admin org-members endpoint — matches
 * the A2UI admin reference form's `target_user_id` field, upgraded from a
 * blind text box to a searchable name/email picker.
 */

"use client";

import { useState } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { Separator } from "@/components/ui/separator";
import { FormSwitch } from "@/modules/client/shared/components/CustomFormFields";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchDoctorUserOptions } from "../../../../queries/iam-user.queries";
import { useAdminStore } from "../../../../stores/admin.store";
import type { TCreatePractitionerFormSchema } from "@/modules/entities/schemas/practitioner";

/** Renders the Basic tab content — no props needed, reads form via useFormContext. */
export function BasicTab() {
  const form = useFormContext<TCreatePractitionerFormSchema>();
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);
  const userId = useWatch({ control: form.control, name: "user_id" });
  /** Ephemeral — user_id has no separate display field, so the picked label lives here only. */
  const [selectedLabel, setSelectedLabel] = useState("");

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <Field>
        <FieldLabel>User (Doctor Account) *</FieldLabel>
        <Controller
          control={form.control}
          name="user_id"
          render={({ field }) => (
            <ReferenceSelect
              fetchOptions={(q) => searchDoctorUserOptions(q, orgId)}
              queryKey={["iam-users", "doctor", "picker", orgId]}
              value={userId ? { id: userId, label: selectedLabel } : null}
              onChange={(opt) => {
                field.onChange(opt ? String(opt.id) : "");
                setSelectedLabel(opt?.label ?? "");
              }}
              placeholder="Search doctor users…"
            />
          )}
        />
      </Field>

      <Separator />

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
