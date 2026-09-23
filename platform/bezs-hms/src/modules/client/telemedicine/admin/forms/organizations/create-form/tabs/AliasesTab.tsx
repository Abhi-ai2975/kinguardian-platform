/**
 * AliasesTab — alternate names for the organization.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

/** @see CreateOrganizationForm */
export function AliasesTab() {
  const form = useFormContext<TCreateOrgFormSchema>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "alias" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = form.formState.errors as any;

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Alternative names this organization is or was known by.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({ value: "" })}
          >
            <PlusIcon data-icon="inline-start" />
            Add Alias
          </Button>
        </div>

        {fields.map((alias, i) => (
          <Field
            key={alias.id}
            data-invalid={!!e?.alias?.[i]?.value || undefined}
            className="flex items-start gap-2"
          >
            <div className="flex-1">
              <Controller
                control={form.control}
                name={`alias.${i}.value`}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Alias name"
                    aria-invalid={!!e?.alias?.[i]?.value}
                  />
                )}
              />
              {e?.alias?.[i]?.value && (
                <FieldError>{e.alias[i].value.message}</FieldError>
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0 text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2Icon data-icon />
            </Button>
          </Field>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No aliases added.</p>
        )}
    </div>
  );
}
