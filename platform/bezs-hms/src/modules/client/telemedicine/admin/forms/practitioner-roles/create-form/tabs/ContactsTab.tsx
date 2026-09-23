/**
 * ContactsTab — contact persons/organizations for this practitioner role.
 * Each contact card contains purpose, address, an organization reference,
 * and nested names[]/telecoms[] sections.
 *
 * `purpose` is NOT present in the A2UI reference form for PractitionerRole
 * (contact isn't covered there at all) — kept as a plain text pair rather
 * than guessing a TerminologySelect binding that could silently return
 * empty results. `address_use`/`address_type` reuse the generic
 * `Patient`/`address.use`/`address.type` bindings already proven across
 * every prior resource this session.
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
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchOrganizationOptions } from "../../../../queries/organization.queries";
import { useAdminStore } from "../../../../stores/admin.store";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";
import { ContactNestedRows } from "../ContactNestedRows";

/** @see CreatePractitionerRoleForm */
export function ContactsTab() {
  const form = useFormContext<TCreatePractitionerRoleFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contact",
  });
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Contact persons or organizations for this role.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Contact
        </Button>
      </div>

      {fields.map((contact, i) => {
        const orgRef = form.watch(`contact.${i}.organization`);
        const orgRefId = orgRef ? Number(orgRef.split("/")[1]) : undefined;
        return (
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

              {/* Organization reference */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Organization
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Organization</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`contact.${i}.organization`}
                      render={({ field }) => (
                        <ReferenceSelect
                          fetchOptions={(q) => searchOrganizationOptions(q, orgId)}
                          queryKey={["organizations", "picker", orgId]}
                          value={
                            orgRefId
                              ? { id: orgRefId, label: form.getValues(`contact.${i}.organization_display`) ?? "" }
                              : null
                          }
                          onChange={(opt) => {
                            field.onChange(opt ? `Organization/${opt.id}` : "");
                            form.setValue(`contact.${i}.organization_display`, opt?.label ?? "");
                          }}
                          placeholder="Search organizations…"
                        />
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Organization Display</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`contact.${i}.organization_display`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="General Hospital" />
                      )}
                    />
                  </Field>
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
                        <Input {...field} value={field.value ?? ""} placeholder="123 Main St" />
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

              {/* Nested names + telecoms — owns their own useFieldArray */}
              <ContactNestedRows contactIndex={i} control={form.control} />
            </CardContent>
          </Card>
        );
      })}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No contacts added.</p>
      )}
    </div>
  );
}
