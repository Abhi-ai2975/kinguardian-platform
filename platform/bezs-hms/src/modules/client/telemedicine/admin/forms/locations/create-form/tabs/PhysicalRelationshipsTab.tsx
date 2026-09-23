/**
 * PhysicalRelationshipsTab — physical type coding plus the two FHIR
 * reference relationships: managing_organization and part_of (parent
 * location, used for the hierarchy view).
 *
 * `physical_type_*` is sourced live from the FHIR terminology server via
 * TerminologySelect (resource="Location" field="physicalType" — the same
 * binding the A2UI create_location workflow uses) instead of a hand-typed
 * local list.
 *
 * `managing_organization` and `part_of` are searched live via ReferenceSelect
 * against the tenant's organizations/locations respectively — no self-exclude
 * needed here since this is the create form (the record doesn't exist yet).
 */

"use client";

import { useFormContext, useWatch, Controller } from "react-hook-form";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  FormInput,
} from "@/modules/client/shared/components/CustomFormFields";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchOrganizationOptions } from "../../../../queries/organization.queries";
import { searchLocationOptions } from "../../../../queries/location.queries";
import { useAdminStore } from "../../../../stores/admin.store";
import type { TCreateLocationFormSchema } from "@/modules/entities/schemas/location";

/** @see CreateLocationForm */
export function PhysicalRelationshipsTab() {
  const form = useFormContext<TCreateLocationFormSchema>();
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);
  const [managingOrganization, partOf] = useWatch({
    control: form.control,
    name: ["managing_organization", "part_of"],
  });

  /** Decomposes the selected physicalType CodeableConcept into its flat scalar fields. */
  function handlePhysicalTypeChange(value: string | TCodeableConcept | null) {
    if (!value || typeof value !== "object") return;
    form.setValue("physical_type_code", value.code);
    form.setValue("physical_type_system", value.system);
    form.setValue("physical_type_display", value.display);
    // physical_type_text stays a separate, independently-editable field below.
  }

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <p className="text-sm text-muted-foreground">
        Physical type of this location (building, wing, room, bed, etc.).
      </p>

      <Field>
        <FieldLabel>Physical Type</FieldLabel>
        <Controller
          control={form.control}
          name="physical_type_code"
          render={({ field }) => (
            <TerminologySelect
              resource="Location"
              field="physicalType"
              valueType="codeable_concept"
              value={
                field.value
                  ? {
                      code: field.value,
                      system: form.getValues("physical_type_system") ?? "",
                      display: form.getValues("physical_type_display") ?? "",
                    }
                  : null
              }
              onChange={handlePhysicalTypeChange}
              placeholder="Search physical type…"
            />
          )}
        />
      </Field>

      <FormInput
        control={form.control}
        name="physical_type_text"
        label="Physical Type — Free Text"
        placeholder="Optional plain-text description"
      />

      <Separator />

      <p className="text-sm text-muted-foreground">
        Managing organization for this location.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Managing Organization</FieldLabel>
          <Controller
            control={form.control}
            name="managing_organization"
            render={({ field }) => {
              const id = managingOrganization ? Number(managingOrganization.split("/")[1]) : undefined;
              return (
                <ReferenceSelect
                  fetchOptions={(q) => searchOrganizationOptions(q, orgId)}
                  queryKey={["organizations", "picker", orgId]}
                  value={
                    id
                      ? { id, label: form.getValues("managing_organization_display") ?? "" }
                      : null
                  }
                  onChange={(opt) => {
                    field.onChange(opt ? `Organization/${opt.id}` : "");
                    form.setValue("managing_organization_display", opt?.label ?? "");
                  }}
                  placeholder="Search organizations…"
                />
              );
            }}
          />
        </Field>
        <FormInput
          control={form.control}
          name="managing_organization_display"
          label="Managing Organization Display"
          placeholder="General Hospital"
          description="Auto-filled from your selection — you can still edit it."
        />
      </div>

      <Separator />

      <p className="text-sm text-muted-foreground">
        Parent location — used to build the hierarchy view.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Part Of</FieldLabel>
          <Controller
            control={form.control}
            name="part_of"
            render={({ field }) => {
              const id = partOf ? Number(partOf.split("/")[1]) : undefined;
              return (
                <ReferenceSelect
                  fetchOptions={(q) => searchLocationOptions(q, orgId)}
                  queryKey={["locations", "picker", orgId]}
                  value={id ? { id, label: form.getValues("part_of_display") ?? "" } : null}
                  onChange={(opt) => {
                    field.onChange(opt ? `Location/${opt.id}` : "");
                    form.setValue("part_of_display", opt?.label ?? "");
                  }}
                  placeholder="Search locations…"
                />
              );
            }}
          />
        </Field>
        <FormInput
          control={form.control}
          name="part_of_display"
          label="Part Of Display"
          placeholder="Main Building"
          description="Auto-filled from your selection — you can still edit it."
        />
      </div>
    </FieldGroup>
  );
}
