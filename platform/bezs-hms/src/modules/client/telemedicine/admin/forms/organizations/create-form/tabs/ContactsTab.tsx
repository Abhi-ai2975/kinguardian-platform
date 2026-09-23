/**
 * ContactsTab — contact persons (admin, billing, clinical, etc.) for the organization.
 * Each contact card contains nested purpose, name, address, and telecom sections.
 *
 * `name_use`, `address_use`, and `address_type` are sourced live from the FHIR
 * terminology server via TerminologySelect (resource="Patient" — generic
 * HumanName/Address bindings reused across resources).
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";
import { ContactTelecomRows } from "../ContactTelecomRows";

/** @see CreateOrganizationForm */
export function ContactsTab() {
  const form = useFormContext<TCreateOrgFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contact",
  });
  const { formState: { errors } } = form;

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Contact persons (admin, billing, clinical, etc.).
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({})}
          >
            <PlusIcon data-icon="inline-start" />
            Add Contact
          </Button>
        </div>

        {fields.map((contact, i) => (
          <Card key={contact.id}>
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
              <CardTitle className="text-sm">Contact {i + 1}</CardTitle>
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

            <CardContent className="flex flex-col gap-4 pb-4">
              {/* Purpose */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Purpose
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Purpose Code</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`contact.${i}.purpose_code`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="ADMIN" />
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Purpose Display</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`contact.${i}.purpose_display`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="Administrative" />
                      )}
                    />
                  </Field>
                </div>
              </div>

              <Separator />

              {/* Name */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </p>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>Name Use</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`contact.${i}.name_use`}
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
                        name={`contact.${i}.name_family`}
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
                        name={`contact.${i}.name_given`}
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
                        name={`contact.${i}.name_text`}
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
                        name={`contact.${i}.name_prefix`}
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
                        name={`contact.${i}.name_suffix`}
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
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Address
                </p>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>Use</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`contact.${i}.address_use`}
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
                        name={`contact.${i}.address_type`}
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
                  <Field>
                    <FieldLabel>Street Line</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`contact.${i}.address_line`}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="123 Main St, Suite 400 (comma-separated)"
                        />
                      )}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>City</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`contact.${i}.address_city`}
                        render={({ field }) => (
                          <Input {...field} value={field.value ?? ""} placeholder="Springfield" />
                        )}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>District</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`contact.${i}.address_district`}
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
                        name={`contact.${i}.address_state`}
                        render={({ field }) => (
                          <Input {...field} value={field.value ?? ""} placeholder="IL" />
                        )}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Postal Code</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`contact.${i}.address_postal_code`}
                        render={({ field }) => (
                          <Input {...field} value={field.value ?? ""} placeholder="62701" />
                        )}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Country</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`contact.${i}.address_country`}
                        render={({ field }) => (
                          <Input {...field} value={field.value ?? ""} placeholder="US" />
                        )}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Nested telecom — owns its own useFieldArray */}
              <ContactTelecomRows
                contactIndex={i}
                control={form.control}
                errors={errors}
              />
            </CardContent>
          </Card>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No contacts added.</p>
        )}
    </div>
  );
}
