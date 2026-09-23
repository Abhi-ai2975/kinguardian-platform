/**
 * ContactTelecomRows — nested telecom field array for a single contact person.
 *
 * Extracted as its own component so it can call useFieldArray with the parent
 * form's control without violating the rules-of-hooks inside a .map() loop.
 *
 * Used exclusively by ContactsTab.
 */

"use client";

import { useFieldArray, Controller, Control } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

interface ContactTelecomRowsProps {
  /** Index of the parent contact in the contacts field array. */
  contactIndex: number;
  /** react-hook-form control from the parent form. */
  control: Control<TCreateOrgFormSchema>;
  /** formState.errors from the parent form — used to surface validation messages. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: Record<string, any>;
}

/**
 * Renders the telecom sub-array for a single contact person.
 * Scoped field array name: `contact.{contactIndex}.telecom`.
 *
 * @param contactIndex - Index of the parent contact.
 * @param control      - react-hook-form control.
 * @param errors       - Validation errors from formState.
 */
export function ContactTelecomRows({ contactIndex, control, errors }: ContactTelecomRowsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `contact.${contactIndex}.telecom` as const,
  });

  /** Safely navigates errors.contact[n].telecom[m][field]. */
  function rowError(rowIndex: number, field: string): string | undefined {
    return errors?.contact?.[contactIndex]?.telecom?.[rowIndex]?.[field]?.message as string | undefined;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Telecom</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ system: "phone", value: "" })}
        >
          <PlusIcon data-icon="inline-start" />
          Add
        </Button>
      </div>

      {fields.map((telecom, ti) => (
        <div key={telecom.id} className="flex items-start gap-2">
          {/* System */}
          <Field className="w-40" data-invalid={!!rowError(ti, "system") || undefined}>
            <Controller
              control={control}
              name={`contact.${contactIndex}.telecom.${ti}.system`}
              render={({ field }) => (
                <TerminologySelect
                  resource="Patient"
                  field="telecom.system"
                  valueType="code"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="System"
                />
              )}
            />
            {rowError(ti, "system") && <FieldError>{rowError(ti, "system")}</FieldError>}
          </Field>

          {/* Value */}
          <Field className="flex-1" data-invalid={!!rowError(ti, "value") || undefined}>
            <Controller
              control={control}
              name={`contact.${contactIndex}.telecom.${ti}.value`}
              render={({ field }) => (
                <Input {...field} placeholder="Value" aria-invalid={!!rowError(ti, "value")} />
              )}
            />
            {rowError(ti, "value") && <FieldError>{rowError(ti, "value")}</FieldError>}
          </Field>

          {/* Use */}
          <Field className="w-36">
            <Controller
              control={control}
              name={`contact.${contactIndex}.telecom.${ti}.use`}
              render={({ field }) => (
                <TerminologySelect
                  resource="Patient"
                  field="telecom.use"
                  valueType="code"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Use"
                />
              )}
            />
          </Field>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="mt-0.5 shrink-0 text-destructive"
            onClick={() => remove(ti)}
          >
            <Trash2Icon data-icon />
          </Button>
        </div>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No telecom entries.</p>
      )}
    </div>
  );
}
