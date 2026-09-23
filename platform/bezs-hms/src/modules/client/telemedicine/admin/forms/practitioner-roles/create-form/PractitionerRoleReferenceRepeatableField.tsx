/**
 * PractitionerRoleReferenceRepeatableField — shared repeatable
 * reference/display row group for PractitionerRole's `location[]` and
 * `healthcare_service[]` arrays.
 *
 * Layer: client / telemedicine / admin / forms / practitioner-roles
 *
 * Both arrays share the exact same shape
 * (`{reference, reference_display, reference_type?, reference_id?}` on write
 * — only reference/reference_display are meaningful to expose here) and UI
 * pattern (one ReferenceSelect per row), mirroring Schedule's
 * `ActorRepeatableField`.
 */

"use client";

import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { ReferenceSelect, type TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

/** The 2 reference-array fields on the create form that share this exact shape. */
export type PractitionerRoleReferenceArrayName = "location" | "healthcare_service";

interface PractitionerRoleReferenceRepeatableFieldProps {
  /** Form array field name — "location" or "healthcare_service". */
  name: PractitionerRoleReferenceArrayName;
  /** FHIR resource type prefix used to compose the reference string, e.g. "Location". */
  resourceTypePrefix: "Location" | "HealthcareService";
  /** Async search function backing the picker for this array. */
  fetchOptions: (query: string) => Promise<TReferenceOption[]>;
  /** TanStack Query key prefix for the picker. */
  queryKey: unknown[];
  /** "Add …" button label. */
  addLabel: string;
  /** Message shown when the array is empty. */
  emptyMessage: string;
}

/**
 * Renders a repeatable row group where each row is a searchable reference
 * picker + display pair.
 */
export function PractitionerRoleReferenceRepeatableField({
  name,
  resourceTypePrefix,
  fetchOptions,
  queryKey,
  addLabel,
  emptyMessage,
}: PractitionerRoleReferenceRepeatableFieldProps) {
  const form = useFormContext<TCreatePractitionerRoleFormSchema>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <Button type="button" size="sm" variant="outline" onClick={() => append({ reference: "" })}>
          <PlusIcon data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>

      {fields.map((item, i) => (
        <div key={item.id} className="flex items-end gap-2">
          <Field className="flex-1">
            <FieldLabel>Reference</FieldLabel>
            <Controller
              control={form.control}
              name={`${name}.${i}.reference`}
              render={({ field }) => {
                const currentRef = form.watch(`${name}.${i}.reference`);
                const id = currentRef ? Number(currentRef.split("/")[1]) : undefined;
                return (
                  <ReferenceSelect
                    fetchOptions={fetchOptions}
                    queryKey={queryKey}
                    value={
                      id
                        ? { id, label: form.getValues(`${name}.${i}.reference_display`) ?? "" }
                        : null
                    }
                    onChange={(opt) => {
                      field.onChange(opt ? `${resourceTypePrefix}/${opt.id}` : "");
                      form.setValue(`${name}.${i}.reference_display`, opt?.label ?? "");
                    }}
                    placeholder={`Search ${resourceTypePrefix.toLowerCase()}…`}
                  />
                );
              }}
            />
          </Field>
          <Field className="flex-1">
            <FieldLabel>Display</FieldLabel>
            <Controller
              control={form.control}
              name={`${name}.${i}.reference_display`}
              render={({ field }) => (
                <Input {...field} value={field.value ?? ""} placeholder="Display label" />
              )}
            />
          </Field>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 text-destructive"
            onClick={() => remove(i)}
          >
            <Trash2Icon data-icon />
          </Button>
        </div>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
