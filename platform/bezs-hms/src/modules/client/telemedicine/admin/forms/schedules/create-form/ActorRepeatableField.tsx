/**
 * ActorRepeatableField — shared repeatable reference/display row group for
 * Schedule's 3 actor sub-groups (practitioner_roles, locations,
 * healthcare_services).
 *
 * Layer: client / telemedicine / admin / forms / schedules
 *
 * Schedule.actor[] is a plain FHIR reference (`{reference, reference_display}`).
 * Each row's reference is searched live via ReferenceSelect against the
 * target resource; the display field stays a plain, still hand-editable
 * `Input`, auto-filled from the selection. The create form splits actor[]
 * into 3 typed groups for UX clarity, matching the A2UI reference form's 3
 * RepeatableGroups; CreateScheduleModal concatenates them into one actor[]
 * array before submit.
 */

"use client";

import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { ReferenceSelect, type TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";
import type { TCreateScheduleFormSchema } from "@/modules/entities/schemas/schedule";

/** The 3 actor sub-group fields on the create form. */
export type ActorArrayName = "practitioner_roles" | "locations" | "healthcare_services";

interface ActorRepeatableFieldProps {
  /** Form array field name — one of the 3 actor sub-groups. */
  name: ActorArrayName;
  /** FHIR resource type prefix used to compose the reference string, e.g. "PractitionerRole". */
  resourceTypePrefix: "PractitionerRole" | "Location" | "HealthcareService";
  /** Async search function backing the picker for this actor type. */
  fetchOptions: (query: string) => Promise<TReferenceOption[]>;
  /** TanStack Query key prefix for the picker — include every value the fetch depends on. */
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
export function ActorRepeatableField({
  name,
  resourceTypePrefix,
  fetchOptions,
  queryKey,
  addLabel,
  emptyMessage,
}: ActorRepeatableFieldProps) {
  const form = useFormContext<TCreateScheduleFormSchema>();
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
