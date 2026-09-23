/**
 * CodeableConceptRepeatableField — shared repeatable TerminologySelect row
 * group for HealthcareService's 8 CodeableConcept array fields (category,
 * type, specialty, service_provision_code, program, characteristic,
 * communication, referral_method).
 *
 * Layer: client / telemedicine / admin / forms / healthcare-services
 *
 * All 8 fields share the exact same array-item shape
 * (`{coding_system?, coding_code?, coding_display?, text?}`) and UI pattern
 * (one TerminologySelect per row, resource="HealthcareService", field varies)
 * — matching the A2UI reference form's RepeatableGroup + single TerminologySelect
 * template exactly. Extracted once instead of repeating this ~50-line block
 * 8 times across the Classification / Programs & Languages / Characteristics
 * & Referral tabs.
 */

"use client";

import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";

/** The 8 HealthcareService fields that share this exact CodeableConcept array shape. */
export type CodeableConceptArrayName =
  | "category"
  | "type"
  | "specialty"
  | "service_provision_code"
  | "program"
  | "characteristic"
  | "communication"
  | "referral_method";

interface CodeableConceptRepeatableFieldProps {
  /** Form array field name — one of the 8 CodeableConcept-shaped arrays. */
  name: CodeableConceptArrayName;
  /** Terminology server field name for this array, e.g. "category", "serviceProvisionCode". */
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
 * (resource="HealthcareService") that writes coding_system/code/display on selection.
 */
export function CodeableConceptRepeatableField({
  name,
  terminologyField,
  description,
  addLabel,
  placeholder,
  emptyMessage,
}: CodeableConceptRepeatableFieldProps) {
  const form = useFormContext<TCreateHealthcareServiceFormSchema>();
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
                  resource="HealthcareService"
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
