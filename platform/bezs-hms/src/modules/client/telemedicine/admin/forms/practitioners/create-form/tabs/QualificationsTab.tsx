/**
 * QualificationsTab — certifications, licenses, and training records for the
 * practitioner.
 *
 * `code`/`status` are plain text fields, NOT TerminologySelect — the A2UI
 * reference form (practitioner_qualification_form.json) has no terminology
 * binding for qualification code/status at all, unlike every other
 * sub-resource on this form. Guessing a binding here risks a silently empty
 * dropdown (same reasoning as Slot.status).
 *
 * `issuer` IS upgraded to a searchable ReferenceSelect (Organization) even
 * though the A2UI reference form uses plain text — it's a genuine FHIR
 * reference to an Organization, and the picker already exists from this
 * session's reference-picker work. `qualification.identifier[]` (a third
 * level of nesting) is deliberately not exposed in the UI.
 */

"use client";

import { useFormContext, useFieldArray, useWatch, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchOrganizationOptions } from "../../../../queries/organization.queries";
import { useAdminStore } from "../../../../stores/admin.store";
import type { TCreatePractitionerFormSchema } from "@/modules/entities/schemas/practitioner";

/** @see CreatePractitionerForm */
export function QualificationsTab() {
  const form = useFormContext<TCreatePractitionerFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "qualification",
  });
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);
  const qualification = useWatch({ control: form.control, name: "qualification" });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Certifications, licenses, and training for this practitioner.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Qualification
        </Button>
      </div>

      {fields.map((q, i) => {
        const issuerRef = qualification?.[i]?.issuer;
        const issuerId = issuerRef ? Number(issuerRef.split("/")[1]) : undefined;
        return (
          <Card key={q.id}>
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
              <CardTitle className="text-sm">Qualification {i + 1}</CardTitle>
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
              {/* Code */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Code
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Code</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`qualification.${i}.code_code`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="MD" />
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Display</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`qualification.${i}.code_display`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="Doctor of Medicine" />
                      )}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field>
                    <FieldLabel>System URI</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`qualification.${i}.code_system`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="http://hl7.org/fhir/v2/0360" />
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Text</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`qualification.${i}.code_text`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="Free-text description" />
                      )}
                    />
                  </Field>
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Code</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`qualification.${i}.status_code`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="active" />
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Display</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`qualification.${i}.status_display`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="Active" />
                      )}
                    />
                  </Field>
                </div>
              </div>

              {/* Issuer */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Issuing Organization
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Issuer</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`qualification.${i}.issuer`}
                      render={({ field }) => (
                        <ReferenceSelect
                          fetchOptions={(q2) => searchOrganizationOptions(q2, orgId)}
                          queryKey={["organizations", "picker", orgId]}
                          value={
                            issuerId
                              ? { id: issuerId, label: form.getValues(`qualification.${i}.issuer_display`) ?? "" }
                              : null
                          }
                          onChange={(opt) => {
                            field.onChange(opt ? `Organization/${opt.id}` : "");
                            form.setValue(`qualification.${i}.issuer_display`, opt?.label ?? "");
                          }}
                          placeholder="Search organizations…"
                        />
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Issuer Display</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`qualification.${i}.issuer_display`}
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} placeholder="State Medical Board" />
                      )}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Period Start</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`qualification.${i}.period_start`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} type="date" />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>Period End</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`qualification.${i}.period_end`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} type="date" />
                    )}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No qualifications added.</p>
      )}
    </div>
  );
}
