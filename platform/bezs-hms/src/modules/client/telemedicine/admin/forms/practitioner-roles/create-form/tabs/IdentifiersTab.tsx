/**
 * IdentifiersTab — FHIR business identifiers for the practitioner role.
 *
 * `use` is sourced live from the FHIR terminology server via TerminologySelect
 * (resource="Patient" field="identifier.use" — the same generic binding used
 * across every other resource's identifier arrays in this admin section).
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

/** @see CreatePractitionerRoleForm */
export function IdentifiersTab() {
  const form = useFormContext<TCreatePractitionerRoleFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "identifier",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Business identifiers assigned to this role.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ value: "" })}>
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
                  name={`identifier.${i}.use`}
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
                  name={`identifier.${i}.value`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="NPI-104" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>System URI</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifier.${i}.system`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="http://hospital.org/roles" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Assigner</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifier.${i}.assigner`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Credentialing Dept" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Type Code</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifier.${i}.type_code`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="NPI" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Type Display</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifier.${i}.type_display`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="National Provider Identifier" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Period Start</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifier.${i}.period_start`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="date" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Period End</FieldLabel>
                <Controller
                  control={form.control}
                  name={`identifier.${i}.period_end`}
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
