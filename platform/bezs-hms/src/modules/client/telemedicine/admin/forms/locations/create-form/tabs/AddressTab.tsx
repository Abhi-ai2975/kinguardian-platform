/**
 * AddressTab — a single flat address for the location.
 *
 * Unlike Organization's AddressTab, Location has exactly one address (flat
 * `address_*` scalar fields) rather than an array — no add/remove row UI
 * needed.
 *
 * `use` and `type` are sourced live from the FHIR terminology server via
 * TerminologySelect (resource="Patient" — a generic Address binding reused
 * across resources).
 */

"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  FormInput,
} from "@/modules/client/shared/components/CustomFormFields";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateLocationFormSchema } from "@/modules/entities/schemas/location";

/** @see CreateLocationForm */
export function AddressTab() {
  const form = useFormContext<TCreateLocationFormSchema>();

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Use</FieldLabel>
          <Controller
            control={form.control}
            name="address_use"
            render={({ field }) => (
              <TerminologySelect
                resource="Patient"
                field="address.use"
                valueType="code"
                value={field.value}
                onChange={field.onChange}
                placeholder="Select use"
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel>Type</FieldLabel>
          <Controller
            control={form.control}
            name="address_type"
            render={({ field }) => (
              <TerminologySelect
                resource="Patient"
                field="address.type"
                valueType="code"
                value={field.value}
                onChange={field.onChange}
                placeholder="Select type"
              />
            )}
          />
        </Field>
      </div>

      <FormInput
        control={form.control}
        name="address_line"
        label="Street Line"
        placeholder="123 Main St"
      />

      <div className="grid grid-cols-2 gap-3">
        <FormInput control={form.control} name="address_city" label="City" placeholder="Springfield" />
        <FormInput control={form.control} name="address_district" label="District" placeholder="County" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FormInput control={form.control} name="address_state" label="State" placeholder="IL" />
        <FormInput control={form.control} name="address_postal_code" label="Postal Code" placeholder="62701" />
        <FormInput control={form.control} name="address_country" label="Country" placeholder="US" />
      </div>

      <FormInput
        control={form.control}
        name="address_text"
        label="Text (full address)"
        placeholder="123 Main St, Springfield, IL 62701"
      />
    </FieldGroup>
  );
}
