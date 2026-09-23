/**
 * TelecomTab — phone, email, fax and other contact points for the organization.
 *
 * `system` and `use` are sourced live from the FHIR terminology server via
 * TerminologySelect (resource="Patient" — a generic ContactPoint binding
 * reused across resources, the same one the A2UI workflows use) instead of
 * a hand-typed local list.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

/** @see CreateOrganizationForm */
export function TelecomTab() {
  const form = useFormContext<TCreateOrgFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "telecom",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = form.formState.errors as any;

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Phone, email, fax and other contact points for the organization.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({ system: "phone", value: "" })}
          >
            <PlusIcon data-icon="inline-start" />
            Add Telecom
          </Button>
        </div>

        {fields.map((t, i) => (
          <div key={t.id} className="flex items-start gap-2">
            {/* System */}
            <Field className="w-40" data-invalid={!!e?.telecom?.[i]?.system || undefined}>
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

            {/* Value */}
            <Field className="flex-1" data-invalid={!!e?.telecom?.[i]?.value || undefined}>
              <Controller
                control={form.control}
                name={`telecom.${i}.value`}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="555-1234 / admin@org.com"
                    aria-invalid={!!e?.telecom?.[i]?.value}
                  />
                )}
              />
              {e?.telecom?.[i]?.value && (
                <FieldError>{e.telecom[i].value.message}</FieldError>
              )}
            </Field>

            {/* Use */}
            <Field className="w-36">
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

            {/* Rank */}
            <Field className="w-20">
              <Controller
                control={form.control}
                name={`telecom.${i}.rank`}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={1}
                    placeholder="Rank"
                    value={field.value ?? ""}
                    onChange={(ev) =>
                      field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                    }
                  />
                )}
              />
            </Field>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="mt-0.5 shrink-0 text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2Icon data-icon />
            </Button>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No telecom entries added.</p>
        )}
    </div>
  );
}
