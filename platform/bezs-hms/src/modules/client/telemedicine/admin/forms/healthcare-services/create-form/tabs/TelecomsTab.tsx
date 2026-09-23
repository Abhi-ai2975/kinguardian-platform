/**
 * TelecomsTab — phone, email, fax and other contact points for the
 * healthcare service.
 *
 * `system` and `use` are sourced live from the FHIR terminology server via
 * TerminologySelect (resource="Patient" — a generic ContactPoint binding
 * reused across resources).
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";

/** @see CreateHealthcareServiceForm */
export function TelecomsTab() {
  const form = useFormContext<TCreateHealthcareServiceFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "telecom",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Phone, email, fax and other contact points for this service.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ system: "phone" })}
        >
          <PlusIcon data-icon="inline-start" />
          Add Telecom
        </Button>
      </div>

      {fields.map((t, i) => (
        <Card key={t.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Telecom {i + 1}</CardTitle>
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
                <FieldLabel>System</FieldLabel>
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
                      placeholder="System"
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Value</FieldLabel>
                <Controller
                  control={form.control}
                  name={`telecom.${i}.value`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="+1 555 0100" />
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
                      placeholder="Use"
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
          </CardContent>
        </Card>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No telecom entries added.</p>
      )}
    </div>
  );
}
