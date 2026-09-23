/**
 * ContactNestedRows — nested names[]/telecoms[] field arrays for a single
 * PractitionerRole contact.
 *
 * Extracted as its own component so it can call useFieldArray with the
 * parent form's control without violating the rules-of-hooks inside a
 * .map() loop — same pattern as Organization's ContactTelecomRows, extended
 * to a second nested array since PractitionerRole's contact has multiple
 * HumanNames (not just one flat name like Organization's contact).
 *
 * `given`/`prefix`/`suffix` are comma-separated strings in the form; the
 * modal splits each before submit (see PractitionerRoleContactFormItemSchema).
 *
 * Used exclusively by ContactsTab.
 */

"use client";

import { useFieldArray, Controller, Control } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

interface ContactNestedRowsProps {
  /** Index of the parent contact in the top-level `contact` field array. */
  contactIndex: number;
  /** react-hook-form control from the parent form. */
  control: Control<TCreatePractitionerRoleFormSchema>;
}

/**
 * Renders the names[] and telecoms[] sub-arrays for a single contact.
 * Scoped field array names: `contact.{contactIndex}.names` and
 * `contact.{contactIndex}.telecoms`.
 */
export function ContactNestedRows({ contactIndex, control }: ContactNestedRowsProps) {
  const names = useFieldArray({
    control,
    name: `contact.${contactIndex}.names` as const,
  });
  const telecoms = useFieldArray({
    control,
    name: `contact.${contactIndex}.telecoms` as const,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Names */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Names
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => names.append({})}>
            <PlusIcon data-icon="inline-start" />
            Add Name
          </Button>
        </div>

        {names.fields.map((n, ni) => (
          <div key={n.id} className="flex flex-col gap-3 rounded-md border p-3">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Use</FieldLabel>
                <Controller
                  control={control}
                  name={`contact.${contactIndex}.names.${ni}.use`}
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
                  control={control}
                  name={`contact.${contactIndex}.names.${ni}.family`}
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
                  control={control}
                  name={`contact.${contactIndex}.names.${ni}.given`}
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
                  control={control}
                  name={`contact.${contactIndex}.names.${ni}.text`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Dr. John Smith" />
                  )}
                />
              </Field>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="self-end text-destructive"
              onClick={() => names.remove(ni)}
            >
              <Trash2Icon data-icon="inline-start" />
              Remove
            </Button>
          </div>
        ))}

        {names.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No names added.</p>
        )}
      </div>

      <Separator />

      {/* Telecoms */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Telecom
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => telecoms.append({ system: "phone", value: "" })}
          >
            <PlusIcon data-icon="inline-start" />
            Add
          </Button>
        </div>

        {telecoms.fields.map((t, ti) => (
          <div key={t.id} className="flex items-start gap-2">
            <Field className="w-40">
              <Controller
                control={control}
                name={`contact.${contactIndex}.telecoms.${ti}.system`}
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
            <Field className="flex-1">
              <Controller
                control={control}
                name={`contact.${contactIndex}.telecoms.${ti}.value`}
                render={({ field }) => (
                  <Input {...field} value={field.value ?? ""} placeholder="Value" />
                )}
              />
            </Field>
            <Field className="w-36">
              <Controller
                control={control}
                name={`contact.${contactIndex}.telecoms.${ti}.use`}
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
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="mt-0.5 shrink-0 text-destructive"
              onClick={() => telecoms.remove(ti)}
            >
              <Trash2Icon data-icon />
            </Button>
          </div>
        ))}

        {telecoms.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No telecom entries.</p>
        )}
      </div>
    </div>
  );
}
