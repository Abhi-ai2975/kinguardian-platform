/**
 * ScheduleCodeableConceptRepeatableField — shared repeatable TerminologySelect
 * row group for Schedule's 3 CodeableConcept array fields (specialty,
 * service_type, service_category).
 *
 * Layer: client / telemedicine / admin / forms / schedules
 *
 * Mirrors HealthcareService's CodeableConceptRepeatableField — extracted
 * once instead of repeating the same ~50-line block 3 times across the
 * Classification tab.
 *
 * Terminology binding confidence:
 *  - specialty (resource=Schedule field=specialty) and service_type
 *    (resource=Schedule field=serviceType) are confirmed via the A2UI
 *    reference form (schedule_create_form.json).
 *  - service_category (resource=Schedule field=serviceCategory) is NOT
 *    confirmed by any reference form — reasonable guess following the same
 *    camelCase convention as the confirmed fields, flagged for empirical
 *    verification once the terminology DB is reachable again.
 */

"use client";

import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateScheduleFormSchema } from "@/modules/entities/schemas/schedule";

/** The 3 Schedule fields that share this exact CodeableConcept array shape. */
export type ScheduleCodeableConceptArrayName = "specialty" | "service_type" | "service_category";

interface ScheduleCodeableConceptRepeatableFieldProps {
  /** Form array field name — one of the 3 CodeableConcept-shaped arrays. */
  name: ScheduleCodeableConceptArrayName;
  /** Terminology server field name for this array, e.g. "specialty", "serviceType". */
  terminologyField: string;
  /** Section description shown above the list. */
  description: string;
  /** "Add …" button label. */
  addLabel: string;
  /** TerminologySelect placeholder text. */
  placeholder: string;
  /** Message shown when the array is empty. */
  emptyMessage: string;
}

/**
 * Renders a repeatable row group where each row is a single TerminologySelect
 * (resource="Schedule") that writes coding_system/code/display on selection.
 */
export function ScheduleCodeableConceptRepeatableField({
  name,
  terminologyField,
  description,
  addLabel,
  placeholder,
  emptyMessage,
}: ScheduleCodeableConceptRepeatableFieldProps) {
  const form = useFormContext<TCreateScheduleFormSchema>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>

      {fields.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2">
          <div className="flex-1">
            <Controller
              control={form.control}
              name={`${name}.${i}.coding_code`}
              render={({ field }) => (
                <TerminologySelect
                  resource="Schedule"
                  field={terminologyField}
                  valueType="codeable_concept"
                  value={
                    field.value
                      ? ({
                          code: field.value,
                          system: form.getValues(`${name}.${i}.coding_system`) ?? "",
                          display: form.getValues(`${name}.${i}.coding_display`) ?? "",
                        } as TCodeableConcept)
                      : null
                  }
                  onChange={(value) => {
                    if (!value || typeof value !== "object") return;
                    form.setValue(`${name}.${i}.coding_code`, value.code);
                    form.setValue(`${name}.${i}.coding_system`, value.system);
                    form.setValue(`${name}.${i}.coding_display`, value.display);
                  }}
                  placeholder={placeholder}
                />
              )}
            />
          </div>
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
