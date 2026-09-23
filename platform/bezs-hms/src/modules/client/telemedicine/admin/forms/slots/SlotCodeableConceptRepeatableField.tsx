/**
 * SlotCodeableConceptRepeatableField — shared repeatable TerminologySelect row
 * group for Slot's 3 CodeableConcept array fields (specialty, service_type,
 * service_category).
 *
 * Layer: client / telemedicine / admin / forms / slots
 *
 * Generic over the form schema (`T extends FieldValues`) because these 3
 * fields appear identically shaped in two different forms — CreateSlotFormSchema
 * (manual one-off slot) and GenerateSlotsFormSchema (bulk generation, where
 * they act as overrides for values otherwise inherited from the Schedule).
 * `control` is passed explicitly rather than read via useFormContext so the
 * same component works under either form's FormProvider.
 *
 * Each row is bound as a single Controller over the whole array-item object
 * (not per-scalar-field) — TerminologySelect's controlled value/onChange
 * already operates on the full {code, system, display} shape, so this avoids
 * needing separate getValues/setValue plumbing for a generic `T`.
 *
 * Terminology binding confidence:
 *  - No binding for Slot.specialty/service_type/service_category is confirmed
 *    by any A2UI reference form (only Slot.appointment_type_* is, via
 *    generate_slots_form.json) — resource="Slot" field=camelCase guesses,
 *    flagged for empirical verification once the terminology DB is reachable.
 */

"use client";

import {
  useFieldArray,
  Controller,
  type FieldValues,
  type Control,
  type ArrayPath,
  type Path,
} from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";

/** The array-item shape shared by Slot's 3 CodeableConcept fields. */
interface TSlotCodeableConceptItem {
  coding_system?: string;
  coding_code?: string;
  coding_display?: string;
  text?: string;
}

interface SlotCodeableConceptRepeatableFieldProps<T extends FieldValues> {
  /** Form control from the parent form's useForm/useFormContext instance. */
  control: Control<T>;
  /** Form array field name — one of the 3 CodeableConcept-shaped arrays. */
  name: ArrayPath<T>;
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
 * (resource="Slot") bound to the whole array-item object.
 */
export function SlotCodeableConceptRepeatableField<T extends FieldValues>({
  control,
  name,
  terminologyField,
  description,
  addLabel,
  placeholder,
  emptyMessage,
}: SlotCodeableConceptRepeatableFieldProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({} as never)}
        >
          <PlusIcon data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>

      {fields.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2">
          <div className="flex-1">
            <Controller
              control={control}
              name={`${name}.${i}` as Path<T>}
              render={({ field }) => {
                const current = (field.value ?? {}) as TSlotCodeableConceptItem;
                return (
                  <TerminologySelect
                    resource="Slot"
                    field={terminologyField}
                    valueType="codeable_concept"
                    value={
                      current.coding_code
                        ? ({
                            code: current.coding_code,
                            system: current.coding_system ?? "",
                            display: current.coding_display ?? "",
                          } as TCodeableConcept)
                        : null
                    }
                    onChange={(value) => {
                      if (!value || typeof value !== "object") return;
                      field.onChange({
                        ...current,
                        coding_code: value.code,
                        coding_system: value.system,
                        coding_display: value.display,
                      });
                    }}
                    placeholder={placeholder}
                  />
                );
              }}
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
