/**
 * EligibilityTab — eligibility criteria required to receive the service.
 *
 * No terminology binding exists for this field (confirmed against the A2UI
 * reference form, which omits it entirely) — plain text fields, matching
 * how Organization/Location handle fields with no terminology precedent.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import type { TCreateHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";

/** @see CreateHealthcareServiceForm */
export function EligibilityTab() {
  const form = useFormContext<TCreateHealthcareServiceFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "eligibility",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Eligibility criteria required to receive this service.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Criteria
        </Button>
      </div>

      {fields.map((el, i) => (
        <Card key={el.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Eligibility {i + 1}</CardTitle>
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
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Code</FieldLabel>
                <Controller
                  control={form.control}
                  name={`eligibility.${i}.code_code`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. veteran" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Display</FieldLabel>
                <Controller
                  control={form.control}
                  name={`eligibility.${i}.code_display`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Veterans only" />
                  )}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Coding System</FieldLabel>
                <Controller
                  control={form.control}
                  name={`eligibility.${i}.code_system`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="http://example.org/eligibility" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Text</FieldLabel>
                <Controller
                  control={form.control}
                  name={`eligibility.${i}.code_text`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Plain-text description" />
                  )}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Comment</FieldLabel>
              <Controller
                control={form.control}
                name={`eligibility.${i}.comment`}
                render={({ field }) => (
                  <Input {...field} value={field.value ?? ""} placeholder="Additional eligibility details" />
                )}
              />
            </Field>
          </CardContent>
        </Card>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No eligibility criteria added.</p>
      )}
    </div>
  );
}
