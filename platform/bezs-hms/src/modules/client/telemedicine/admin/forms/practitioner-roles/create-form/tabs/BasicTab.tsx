/**
 * BasicTab — core PractitionerRole fields: practitioner + organization
 * references, active, period, availability exceptions.
 */

"use client";

import { useFormContext, useWatch, Controller } from "react-hook-form";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  FormInput,
  FormSwitch,
} from "@/modules/client/shared/components/CustomFormFields";
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchPractitionerOptions } from "../../../../queries/practitioner.queries";
import { searchOrganizationOptions } from "../../../../queries/organization.queries";
import { useAdminStore } from "../../../../stores/admin.store";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

/** Renders the Basic tab content — no props needed, reads form via useFormContext. */
export function BasicTab() {
  const form = useFormContext<TCreatePractitionerRoleFormSchema>();
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);
  const [practitioner, organization] = useWatch({
    control: form.control,
    name: ["practitioner", "organization"],
  });

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Practitioner</FieldLabel>
          <Controller
            control={form.control}
            name="practitioner"
            render={({ field }) => {
              const id = practitioner ? Number(practitioner.split("/")[1]) : undefined;
              return (
                <ReferenceSelect
                  fetchOptions={(q) => searchPractitionerOptions(q, orgId)}
                  queryKey={["practitioners", "picker", orgId]}
                  value={id ? { id, label: form.getValues("practitioner_display") ?? "" } : null}
                  onChange={(opt) => {
                    field.onChange(opt ? `Practitioner/${opt.id}` : "");
                    form.setValue("practitioner_display", opt?.label ?? "");
                  }}
                  placeholder="Search practitioners…"
                />
              );
            }}
          />
        </Field>
        <FormInput
          control={form.control}
          name="practitioner_display"
          label="Practitioner Display"
          placeholder="Dr. Jane Smith"
          description="Auto-filled from your selection — you can still edit it."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Organization</FieldLabel>
          <Controller
            control={form.control}
            name="organization"
            render={({ field }) => {
              const id = organization ? Number(organization.split("/")[1]) : undefined;
              return (
                <ReferenceSelect
                  fetchOptions={(q) => searchOrganizationOptions(q, orgId)}
                  queryKey={["organizations", "picker", orgId]}
                  value={id ? { id, label: form.getValues("organization_display") ?? "" } : null}
                  onChange={(opt) => {
                    field.onChange(opt ? `Organization/${opt.id}` : "");
                    form.setValue("organization_display", opt?.label ?? "");
                  }}
                  placeholder="Search organizations…"
                />
              );
            }}
          />
        </Field>
        <FormInput
          control={form.control}
          name="organization_display"
          label="Organization Display"
          placeholder="General Hospital"
          description="Auto-filled from your selection — you can still edit it."
        />
      </div>

      <Separator />

      <FormSwitch control={form.control} name="active" label="Active" />

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Period Start</FieldLabel>
          <Controller
            control={form.control}
            name="period_start"
            render={({ field }) => (
              <Input {...field} value={field.value ?? ""} type="date" />
            )}
          />
        </Field>
        <Field>
          <FieldLabel>Period End</FieldLabel>
          <Controller
            control={form.control}
            name="period_end"
            render={({ field }) => (
              <Input {...field} value={field.value ?? ""} type="date" />
            )}
          />
        </Field>
      </div>

      <FormInput
        control={form.control}
        name="availability_exceptions"
        label="Availability Exceptions"
        placeholder="e.g. Unavailable during conference week"
      />
    </FieldGroup>
  );
}
