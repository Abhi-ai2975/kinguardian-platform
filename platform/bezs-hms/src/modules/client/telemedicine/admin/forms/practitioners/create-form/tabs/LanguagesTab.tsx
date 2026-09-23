/**
 * LanguagesTab — communication language preferences for the practitioner.
 *
 * `language` is sourced live from the FHIR terminology server via
 * TerminologySelect (resource="Patient" field="communication.language",
 * valueType="codeable_concept" — confirmed via the A2UI reference form
 * practitioner_communication_form.json).
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { FormSwitch } from "@/modules/client/shared/components/CustomFormFields";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import type { TCreatePractitionerFormSchema } from "@/modules/entities/schemas/practitioner";

/** @see CreatePractitionerForm */
export function LanguagesTab() {
  const form = useFormContext<TCreatePractitionerFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "communications",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Languages this practitioner can communicate in.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ language_code: "" })}>
          <PlusIcon data-icon="inline-start" />
          Add Language
        </Button>
      </div>

      {fields.map((c, i) => (
        <Card key={c.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Language {i + 1}</CardTitle>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2Icon data-icon />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-4">
            <Field>
              <FieldLabel>Language *</FieldLabel>
              <Controller
                control={form.control}
                name={`communications.${i}.language_code`}
                render={({ field }) => (
                  <TerminologySelect
                    resource="Patient"
                    field="communication.language"
                    valueType="codeable_concept"
                    value={
                      field.value
                        ? ({
                            code: field.value,
                            system: form.getValues(`communications.${i}.language_system`) ?? "",
                            display: form.getValues(`communications.${i}.language_display`) ?? "",
                          } as TCodeableConcept)
                        : null
                    }
                    onChange={(value) => {
                      if (!value || typeof value !== "object") return;
                      form.setValue(`communications.${i}.language_code`, value.code);
                      form.setValue(`communications.${i}.language_system`, value.system);
                      form.setValue(`communications.${i}.language_display`, value.display);
                    }}
                    placeholder="Search language…"
                  />
                )}
              />
            </Field>

            <FormSwitch
              control={form.control}
              name={`communications.${i}.preferred`}
              label="Preferred"
            />
          </CardContent>
        </Card>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No languages added.</p>
      )}
    </div>
  );
}
