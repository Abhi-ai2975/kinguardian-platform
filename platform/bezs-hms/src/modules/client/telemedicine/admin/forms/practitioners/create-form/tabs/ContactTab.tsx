/**
 * ContactTab — telecom (ContactPoint) entries for the practitioner.
 *
 * `system`/`use` are sourced live from the FHIR terminology server via
 * TerminologySelect (resource="Patient" field="telecom.system"/"telecom.use"
 * — the same generic binding used across every other resource's telecom
 * arrays this session).
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreatePractitionerFormSchema } from "@/modules/entities/schemas/practitioner";

/** @see CreatePractitionerForm */
export function ContactTab() {
  const form = useFormContext<TCreatePractitionerFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "telecom",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Phone, email, and other contact points.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ system: "phone", value: "" })}
        >
          <PlusIcon data-icon="inline-start" />
          Add Contact Point
        </Button>
      </div>

      {fields.map((t, i) => (
        <Card key={t.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Contact Point {i + 1}</CardTitle>
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
                <FieldLabel>System *</FieldLabel>
                <Controller
                  control={form.control}
                  name={`telecom.${i}.system`}
                  render={({ field }) => (
                    <TerminologySelect
                      resource="Patient"
                      field="telecom.system"
                      valueType="code"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select system"
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Value *</FieldLabel>
                <Controller
                  control={form.control}
                  name={`telecom.${i}.value`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="+1 555 123 4567" />
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Use</FieldLabel>
                <Controller
                  control={form.control}
                  name={`telecom.${i}.use`}
                  render={({ field }) => (
                    <TerminologySelect
                      resource="Patient"
                      field="telecom.use"
                      valueType="code"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select use"
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Rank</FieldLabel>
                <Controller
                  control={form.control}
                  name={`telecom.${i}.rank`}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={1}
                      value={field.value ?? ""}
                      onChange={(ev) =>
                        field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                      }
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
                  name={`telecom.${i}.period_start`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="date" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Period End</FieldLabel>
                <Controller
                  control={form.control}
                  name={`telecom.${i}.period_end`}
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
        <p className="text-sm text-muted-foreground">No contact points added.</p>
      )}
    </div>
  );
}
