/**
 * AddressTab — postal and physical addresses for the organization.
 *
 * `use` and `type` are sourced live from the FHIR terminology server via
 * TerminologySelect (resource="Patient" — a generic Address binding reused
 * across resources, same one the A2UI workflows use).
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

/** @see CreateOrganizationForm */
export function AddressTab() {
  const form = useFormContext<TCreateOrgFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "address",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Postal and physical addresses for the organization.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({})}
          >
            <PlusIcon data-icon="inline-start" />
            Add Address
          </Button>
        </div>

        {fields.map((addr, i) => (
          <Card key={addr.id}>
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
              <CardTitle className="text-sm">Address {i + 1}</CardTitle>
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
                    name={`address.${i}.use`}
                    render={({ field }) => (
                      <TerminologySelect
                        resource="Patient"
                        field="address.use"
                        valueType="code"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select use"
                      />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`address.${i}.type`}
                    render={({ field }) => (
                      <TerminologySelect
                        resource="Patient"
                        field="address.type"
                        valueType="code"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select type"
                      />
                    )}
                  />
                </Field>
              </div>

              {/* Single line — wrapped in [string] by modal handleSubmit */}
              <Field>
                <FieldLabel>Street Line</FieldLabel>
                <Controller
                  control={form.control}
                  name={`address.${i}.line`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="123 Main St" />
                  )}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>City</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`address.${i}.city`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} placeholder="Springfield" />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>District</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`address.${i}.district`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} placeholder="County" />
                    )}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel>State</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`address.${i}.state`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} placeholder="IL" />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>Postal Code</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`address.${i}.postal_code`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} placeholder="62701" />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>Country</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`address.${i}.country`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} placeholder="US" />
                    )}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>Text (full address)</FieldLabel>
                <Controller
                  control={form.control}
                  name={`address.${i}.text`}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="123 Main St, Springfield, IL 62701"
                    />
                  )}
                />
              </Field>
            </CardContent>
          </Card>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No addresses added.</p>
        )}
    </div>
  );
}
