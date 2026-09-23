/**
 * BasicTab — core Organization fields: name, type, active, and partOf reference.
 *
 * The Organization Type field is sourced live from the FHIR terminology
 * server via TerminologySelect (resource="Organization" field="type" —
 * the same binding the A2UI create_organization workflow uses) rather than
 * a hand-typed local list.
 */

"use client";

import { useFormContext, useWatch, Controller } from "react-hook-form";

import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  FormInput,
  FormSwitch,
} from "@/modules/client/shared/components/CustomFormFields";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchOrganizationOptions } from "../../../../queries/organization.queries";
import { useAdminStore } from "../../../../stores/admin.store";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

/**
 * Renders the Basic tab content — no props needed, reads form via useFormContext.
 */
export function BasicTab() {
  const form = useFormContext<TCreateOrgFormSchema>();
  const {
    formState: { errors },
  } = form;
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);

  /** The type array holds exactly one entry today — watch it for the selected concept. */
  const currentType = useWatch({ control: form.control, name: "type" })?.[0];
  const partof = useWatch({ control: form.control, name: "partof" });

  /** Replaces the entire type array with a single entry matching the chosen concept. */
  function handleTypeChange(value: string | TCodeableConcept | null) {
    if (!value || typeof value !== "object") return;
    form.setValue(
      "type",
      [
        {
          coding_system: value.system,
          coding_code: value.code,
          coding_display: value.display,
        },
      ],
      { shouldValidate: true },
    );
  }

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      {/* Name */}
      <FormInput
        control={form.control}
        name="name"
        label="Name *"
        placeholder="General Hospital"
      />

      {/* Organization type — sourced live from the terminology service */}
      <Field data-invalid={!!errors.type || undefined}>
        <FieldLabel>Organization Type *</FieldLabel>
        <TerminologySelect
          resource="Organization"
          field="type"
          valueType="codeable_concept"
          value={
            currentType
              ? {
                  code: currentType.coding_code ?? "",
                  system: currentType.coding_system ?? "",
                  display: currentType.coding_display ?? "",
                }
              : null
          }
          onChange={handleTypeChange}
          placeholder="Search organization type…"
        />
        {errors.type && (
          <FieldError>
            {(errors.type as { message?: string }).message ??
              "At least one organization type is required"}
          </FieldError>
        )}
      </Field>

      {/* Active */}
      <FormSwitch
        control={form.control}
        name="active"
        label="Active"
        description="Inactive organizations are hidden from clinical workflows."
        descriptionPlace="bottom"
      />

      <Separator />

      {/* Part-of — searched live from the tenant's organizations */}
      <Field>
        <FieldLabel>Part Of</FieldLabel>
        <Controller
          control={form.control}
          name="partof"
          render={({ field }) => {
            const partofId = partof ? Number(partof.split("/")[1]) : undefined;
            return (
              <ReferenceSelect
                fetchOptions={(q) => searchOrganizationOptions(q, orgId)}
                queryKey={["organizations", "picker", orgId]}
                value={
                  partofId
                    ? { id: partofId, label: form.getValues("partof_display") ?? "" }
                    : null
                }
                onChange={(opt) => {
                  field.onChange(opt ? `Organization/${opt.id}` : "");
                  form.setValue("partof_display", opt?.label ?? "");
                }}
                placeholder="Search organizations…"
              />
            );
          }}
        />
      </Field>
      <FormInput
        control={form.control}
        name="partof_display"
        label="Part Of Display"
        placeholder="Parent Health Network"
        description="Auto-filled from your selection above — you can still edit it."
      />
    </FieldGroup>
  );
}
