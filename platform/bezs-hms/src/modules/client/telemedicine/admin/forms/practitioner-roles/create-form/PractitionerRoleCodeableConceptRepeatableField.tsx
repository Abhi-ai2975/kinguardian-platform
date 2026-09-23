/**
 * PractitionerRoleCodeableConceptRepeatableField — shared repeatable
 * TerminologySelect row group for PractitionerRole's 4 CodeableConcept array
 * fields (code, specialty, characteristic, communication).
 *
 * Layer: client / telemedicine / admin / forms / practitioner-roles
 *
 * Mirrors HealthcareService's/Schedule's CodeableConceptRepeatableField —
 * extracted once instead of repeating the same ~50-line block 4 times.
 *
 * Terminology binding confidence:
 *  - code (resource=PractitionerRole field=code) and specialty
 *    (resource=PractitionerRole field=specialty) are confirmed via the A2UI
 *    reference form (practitioner_role_create_form.json).
 *  - characteristic and communication are NOT present in that reference
 *    form — same CodeableConcept shape, wired the same way, but the
 *    resource/field binding is an unverified guess following the same
 *    field-name convention as the confirmed fields.
 */

"use client";

import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

/** The 4 PractitionerRole fields that share this exact CodeableConcept array shape. */
export type PractitionerRoleCodeableConceptArrayName =
  | "code"
  | "specialty"
  | "characteristic"
  | "communication";

interface PractitionerRoleCodeableConceptRepeatableFieldProps {
  /** Form array field name — one of the 4 CodeableConcept-shaped arrays. */
  name: PractitionerRoleCodeableConceptArrayName;
  /** Terminology server field name for this array, e.g. "code", "specialty". */
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
 * (resource="PractitionerRole") that writes coding_system/code/display on selection.
 */
export function PractitionerRoleCodeableConceptRepeatableField({
  name,
  terminologyField,
  description,
  addLabel,
  placeholder,
  emptyMessage,
}: PractitionerRoleCodeableConceptRepeatableFieldProps) {
  const form = useFormContext<TCreatePractitionerRoleFormSchema>();
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
                  resource="PractitionerRole"
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
