/**
 * IdentifiersTab — FHIR business identifiers (e.g. hospital wing numbers) for the location.
 * Unlike Organization's identifiers, `value` is optional here (fhir-gql's
 * LocationIdentifierInput does not require it).
 *
 * `use` is sourced live from the FHIR terminology server via
 * TerminologySelect (resource="Patient" field="identifier.use" — the same
 * generic binding the A2UI workflows use).
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateLocationFormSchema } from "@/modules/entities/schemas/location";

/** @see CreateLocationForm */
export function IdentifiersTab() {
  const form = useFormContext<TCreateLocationFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "identifiers",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Business identifiers assigned to this location.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Identifier
        </Button>
      </div>

      {fields.map((id, i) => (
        <Card key={id.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Identifier {i + 1}</CardTitle>
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
                  name={`identifiers.${i}.use`}
                  render={({ field }) => (
                    <TerminologySelect
                      resource="Patient"
                      field="identifier.use"
                      valueType="code"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select use"
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Value</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifiers.${i}.value`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="W-104" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>System URI</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifiers.${i}.system`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="http://hospital.org/wings" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Assigner</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifiers.${i}.assigner`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Facilities Dept" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Type Code</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifiers.${i}.type_code`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="WING" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Type Display</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifiers.${i}.type_display`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Wing Number" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Period Start</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifiers.${i}.period_start`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="date" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Period End</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifiers.${i}.period_end`}
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
        <p className="text-sm text-muted-foreground">No identifiers added.</p>
      )}
    </div>
  );
}
