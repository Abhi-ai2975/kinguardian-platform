/**
 * EndpointsTab — technical endpoint references for the organization.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

/** @see CreateOrganizationForm */
export function EndpointsTab() {
  const form = useFormContext<TCreateOrgFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "endpoint",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = form.formState.errors as any;

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Technical endpoint references (e.g. FHIR, HL7 v2 interfaces).
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({ reference: "" })}
          >
            <PlusIcon data-icon="inline-start" />
            Add Endpoint
          </Button>
        </div>

        {fields.map((ep, i) => (
          <div key={ep.id} className="flex items-start gap-2">
            {/* Reference (required) */}
            <Field
              className="flex-1"
              data-invalid={!!e?.endpoint?.[i]?.reference || undefined}
            >
              <Controller
                control={form.control}
                name={`endpoint.${i}.reference`}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Endpoint/1"
                    aria-invalid={!!e?.endpoint?.[i]?.reference}
                  />
                )}
              />
              {e?.endpoint?.[i]?.reference && (
                <FieldError>{e.endpoint[i].reference.message}</FieldError>
              )}
            </Field>

            {/* Display */}
            <Field className="flex-1">
              <Controller
                control={form.control}
                name={`endpoint.${i}.reference_display`}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="FHIR R4 endpoint"
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
          <p className="text-sm text-muted-foreground">No endpoints added.</p>
        )}
    </div>
  );
}
