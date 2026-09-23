/**
 * EditLocationForm — field layout shell for the Edit Location Sheet.
 *
 * Layer: client / telemedicine / admin / forms
 * Resource: Location
 *
 * Pattern: this component does NOT own its form instance. It reads the form
 * via useFormContext() injected by the parent modal's <FormProvider>. All
 * submission logic and server action wiring live in EditLocationModal.
 *
 * Only scalar fields patchable per the fhir-gql PATCH contract are exposed
 * (see PatchLocationDtoSchema) — array sub-resources are not editable here.
 * Unlike Organization's edit form (3 fields), Location has significantly
 * more patchable scalars, so fields are grouped into sections on one
 * scrolling form rather than a full tabbed layout.
 *
 * `status`, `mode`, `address_use`, `address_type`, and `physical_type_code`
 * are sourced live from the FHIR terminology server via TerminologySelect —
 * see create-form/tabs/BasicTab.tsx and PhysicalRelationshipsTab.tsx for the
 * same bindings used on the create side.
 */

"use client";

import { useFormContext, useWatch, Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  FormInput,
  FormTextarea,
} from "@/modules/client/shared/components/CustomFormFields";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchOrganizationOptions } from "../../queries/organization.queries";
import { searchLocationOptions } from "../../queries/location.queries";
import type { TEditLocationFormSchema } from "@/modules/entities/schemas/location";

interface EditLocationFormProps {
  /**
   * Called by form.handleSubmit — receives validated TEditLocationFormSchema values.
   * The modal maps these to the PATCH API payload.
   */
  onSubmit: (values: TEditLocationFormSchema) => Promise<void>;
  /** Closes the modal when the user cancels. */
  onCancel: () => void;
  /** True while the server action is executing — disables the submit button. */
  isPending: boolean;
  /** The location's own tenant — scopes the managing-organization/part-of pickers. */
  orgId: string | null;
  /** The location's own id — excluded from its own part_of picker (can't be its own parent). */
  excludeId: number;
}

/**
 * Dumb form shell for editing a location.
 * Reads the form instance from FormProvider; renders field layout only.
 */
export function EditLocationForm({
  onSubmit,
  onCancel,
  isPending,
  orgId,
  excludeId,
}: EditLocationFormProps) {
  const form = useFormContext<TEditLocationFormSchema>();
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
  }

  /** Decomposes the selected operationalStatus Coding into its flat scalar fields. */
  function handleOperationalStatusChange(value: string | TCodeableConcept | null) {
    if (!value || typeof value !== "object") return;
    form.setValue("operational_status_system", value.system);
    form.setValue("operational_status_code", value.code);
    form.setValue("operational_status_display", value.display);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto px-4 pt-4"
    >
      <FieldGroup className="flex flex-col gap-4 pb-2">
        <FormInput control={form.control} name="name" label="Name" />
        <FormTextarea control={form.control} name="description" label="Description" />

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <TerminologySelect
                  resource="Location"
                  field="status"
                  valueType="code"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select status"
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Mode</FieldLabel>
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <TerminologySelect
                  resource="Location"
                  field="mode"
                  valueType="code"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select mode"
                />
              )}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel>Operational Status</FieldLabel>
          <Controller
            control={form.control}
            name="operational_status_code"
            render={({ field }) => (
              <TerminologySelect
                resource="Location"
                field="operationalStatus"
                valueType="codeable_concept"
                value={
                  field.value
                    ? {
                        code: field.value,
                        system: form.getValues("operational_status_system") ?? "",
                        display: form.getValues("operational_status_display") ?? "",
                      }
                    : null
                }
                onChange={handleOperationalStatusChange}
                placeholder="Search operational status…"
              />
            )}
          />
        </Field>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Address Use</FieldLabel>
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
            <FieldLabel>Address Type</FieldLabel>
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
        <FormInput control={form.control} name="address_line" label="Street Line" />
        <div className="grid grid-cols-2 gap-3">
          <FormInput control={form.control} name="address_city" label="City" />
          <FormInput control={form.control} name="address_district" label="District" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormInput control={form.control} name="address_state" label="State" />
          <FormInput control={form.control} name="address_postal_code" label="Postal Code" />
          <FormInput control={form.control} name="address_country" label="Country" />
        </div>
        <FormInput control={form.control} name="address_text" label="Address Text" />
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Address Period Start</FieldLabel>
            <Controller
              control={form.control}
              name="address_period_start"
              render={({ field }) => (
                <Input {...field} value={field.value ?? ""} type="date" />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Address Period End</FieldLabel>
            <Controller
              control={form.control}
              name="address_period_end"
              render={({ field }) => (
                <Input {...field} value={field.value ?? ""} type="date" />
              )}
            />
          </Field>
        </div>

        <Separator />

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
            label="Managing Org Display"
            description="Auto-filled from your selection — you can still edit it."
          />
        </div>
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
                    fetchOptions={(q) => searchLocationOptions(q, orgId, excludeId)}
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
            description="Auto-filled from your selection — you can still edit it."
          />
        </div>

        <Separator />

        <FormInput control={form.control} name="availability_exceptions" label="Availability Exceptions" />

        <div className="grid grid-cols-3 gap-3">
          <Field>
            <FieldLabel>Longitude</FieldLabel>
            <Controller
              control={form.control}
              name="position_longitude"
              render={({ field }) => (
                <Input
                  type="number"
                  step="any"
                  value={field.value ?? ""}
                  onChange={(ev) =>
                    field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                  }
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Latitude</FieldLabel>
            <Controller
              control={form.control}
              name="position_latitude"
              render={({ field }) => (
                <Input
                  type="number"
                  step="any"
                  value={field.value ?? ""}
                  onChange={(ev) =>
                    field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                  }
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Altitude</FieldLabel>
            <Controller
              control={form.control}
              name="position_altitude"
              render={({ field }) => (
                <Input
                  type="number"
                  step="any"
                  value={field.value ?? ""}
                  onChange={(ev) =>
                    field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                  }
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
