/**
 * BasicTab — core HealthcareService fields: name, active, comment,
 * extra details, appointment requirement, and availability exceptions.
 */

"use client";

import { useFormContext } from "react-hook-form";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  FormInput,
  FormSwitch,
  FormTextarea,
} from "@/modules/client/shared/components/CustomFormFields";
import type { TCreateHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";

/** Renders the Basic tab content — no props needed, reads form via useFormContext. */
export function BasicTab() {
  const form = useFormContext<TCreateHealthcareServiceFormSchema>();

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <FormInput
          control={form.control}
          name="name"
          label="Service Name"
          placeholder="General Practice Consultation"
        />
        <FormSwitch control={form.control} name="active" label="Active" />
      </div>

      <FormSwitch
        control={form.control}
        name="appointment_required"
        label="Appointment Required"
        description="Whether an appointment is required to access this service."
        descriptionPlace="bottom"
      />

      <Separator />

      <FormTextarea
        control={form.control}
        name="comment"
        label="Comment"
        placeholder="Short public-facing description of the service"
      />
      <FormTextarea
        control={form.control}
        name="extra_details"
        label="Extra Details"
        placeholder="Internal notes or additional information not shown to patients"
      />
      <FormInput
        control={form.control}
        name="availability_exceptions"
        label="Availability Exceptions"
        placeholder="e.g. Closed public holidays"
      />
    </FieldGroup>
  );
}
