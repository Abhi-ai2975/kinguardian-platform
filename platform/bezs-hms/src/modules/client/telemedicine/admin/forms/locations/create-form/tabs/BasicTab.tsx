/**
 * BasicTab — core Location fields: status, name, description, mode,
 * operational status, aliases, and type codings.
 *
 * `status`, `mode`, `operationalStatus`, and `types[]` are sourced live from
 * the FHIR terminology server via TerminologySelect (resource="Location" —
 * the same bindings the A2UI create_location workflow uses) instead of
 * hand-typed local lists.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  FormInput,
  FormTextarea,
} from "@/modules/client/shared/components/CustomFormFields";
import {
  TerminologySelect,
  type TCodeableConcept,
} from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateLocationFormSchema } from "@/modules/entities/schemas/location";

/** Renders the Basic tab content — no props needed, reads form via useFormContext. */
export function BasicTab() {
  const form = useFormContext<TCreateLocationFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "types",
  });

  /** Decomposes the selected operationalStatus Coding into its three flat scalar fields. */
  function handleOperationalStatusChange(value: string | TCodeableConcept | null) {
    if (!value || typeof value !== "object") return;
    form.setValue("operational_status_system", value.system);
    form.setValue("operational_status_code", value.code);
    form.setValue("operational_status_display", value.display);
  }

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <FormInput
        control={form.control}
        name="name"
        label="Name"
        placeholder="Main Building"
      />

      <FormTextarea
        control={form.control}
        name="description"
        label="Description"
        placeholder="Primary hospital building"
      />

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Status</FieldLabel>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <TerminologySelect
                resource="Location"
                field="status"
                valueType="code"
                value={field.value}
                onChange={field.onChange}
                placeholder="Select status"
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel>Mode</FieldLabel>
          <Controller
            control={form.control}
            name="mode"
            render={({ field }) => (
              <TerminologySelect
                resource="Location"
                field="mode"
                valueType="code"
                value={field.value}
                onChange={field.onChange}
                placeholder="Select mode"
              />
            )}
          />
        </Field>
      </div>

      <Separator />

      <Field>
        <FieldLabel>Operational Status</FieldLabel>
        <Controller
          control={form.control}
          name="operational_status_code"
          render={({ field }) => (
            <TerminologySelect
              resource="Location"
              field="operationalStatus"
              valueType="codeable_concept"
              value={
                field.value
                  ? {
                      code: field.value,
                      system: form.getValues("operational_status_system") ?? "",
                      display: form.getValues("operational_status_display") ?? "",
                    }
                  : null
              }
              onChange={handleOperationalStatusChange}
              placeholder="Search operational status…"
            />
          )}
        />
      </Field>

      <FormInput
        control={form.control}
        name="aliases"
        label="Aliases"
        placeholder="Old Wing, Building C"
        description="Comma-separated alternate names."
      />

      <Separator />

      {/* Type codings — sourced live from the terminology service, one TerminologySelect per row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Coded concepts indicating the type of this location (e.g. ward, room).
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Type
        </Button>
      </div>

      {fields.map((t, i) => (
        <Card key={t.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Type {i + 1}</CardTitle>
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
              <FieldLabel>Type</FieldLabel>
              <Controller
                control={form.control}
                name={`types.${i}.coding_code`}
                render={({ field }) => (
                  <TerminologySelect
                    resource="Location"
                    field="type"
                    valueType="codeable_concept"
                    value={
                      field.value
                        ? {
                            code: field.value,
                            system: form.getValues(`types.${i}.coding_system`) ?? "",
                            display: form.getValues(`types.${i}.coding_display`) ?? "",
                          }
                        : null
                    }
                    onChange={(value) => {
                      if (!value || typeof value !== "object") return;
                      form.setValue(`types.${i}.coding_code`, value.code);
                      form.setValue(`types.${i}.coding_system`, value.system);
                      form.setValue(`types.${i}.coding_display`, value.display);
                    }}
                    placeholder="Search type…"
                  />
                )}
              />
            </Field>
            <Field>
              <FieldLabel>Text (optional)</FieldLabel>
              <Controller
                control={form.control}
                name={`types.${i}.text`}
                render={({ field }) => (
                  <Input {...field} value={field.value ?? ""} placeholder="Patient room" />
                )}
              />
            </Field>
          </CardContent>
        </Card>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No types added.</p>
      )}
    </FieldGroup>
  );
}
