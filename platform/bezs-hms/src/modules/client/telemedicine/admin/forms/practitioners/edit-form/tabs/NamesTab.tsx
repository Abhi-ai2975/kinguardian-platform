/**
 * NamesTab (edit) — HumanName entries for the practitioner. Same fields and
 * bindings as the create form's NamesTab, typed against the edit form
 * schema — fhir-gql's `/full` PATCH endpoint fully replaces this array.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TEditPractitionerFormSchema } from "@/modules/entities/schemas/practitioner";

/** @see EditPractitionerForm */
export function NamesTab() {
  const form = useFormContext<TEditPractitionerFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "names",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Names for this practitioner. Saving replaces the entire list.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Name
        </Button>
      </div>

      {fields.map((n, i) => (
        <Card key={n.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Name {i + 1}</CardTitle>
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
                <FieldLabel>Use</FieldLabel>
                <Controller
                  control={form.control}
                  name={`names.${i}.use`}
                  render={({ field }) => (
                    <TerminologySelect
                      resource="Patient"
                      field="name.use"
                      valueType="code"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select use"
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Family Name</FieldLabel>
                <Controller
                  control={form.control}
                  name={`names.${i}.family`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Smith" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Given Names</FieldLabel>
                <Controller
                  control={form.control}
                  name={`names.${i}.given`}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="John, Michael (comma-separated)"
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Text / Full Name</FieldLabel>
                <Controller
                  control={form.control}
                  name={`names.${i}.text`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Dr. John Smith" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Prefixes</FieldLabel>
                <Controller
                  control={form.control}
                  name={`names.${i}.prefix`}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Dr., Prof. (comma-separated)"
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Suffixes</FieldLabel>
                <Controller
                  control={form.control}
                  name={`names.${i}.suffix`}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="MD, PhD (comma-separated)"
                    />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Period Start</FieldLabel>
                <Controller
                  control={form.control}
                  name={`names.${i}.period_start`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="date" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Period End</FieldLabel>
                <Controller
                  control={form.control}
                  name={`names.${i}.period_end`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="date" />
                  )}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No names added.</p>
      )}
    </div>
  );
}
