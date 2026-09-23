/**
 * AvailabilityTab — regular available-time slots and not-available periods
 * for the healthcare service.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { FormSwitch } from "@/modules/client/shared/components/CustomFormFields";
import type { TCreateHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";

/** @see CreateHealthcareServiceForm */
export function AvailabilityTab() {
  const form = useFormContext<TCreateHealthcareServiceFormSchema>();
  const availableTime = useFieldArray({ control: form.control, name: "available_time" });
  const notAvailable = useFieldArray({ control: form.control, name: "not_available" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = form.formState.errors as any;

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Regular available hours.</p>
        <Button type="button" size="sm" variant="outline" onClick={() => availableTime.append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Hours
        </Button>
      </div>

      {availableTime.fields.map((a, i) => (
        <Card key={a.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Hours {i + 1}</CardTitle>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              onClick={() => availableTime.remove(i)}
            >
              <Trash2Icon data-icon />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-4">
            <Field>
              <FieldLabel>Days of Week</FieldLabel>
              <Controller
                control={form.control}
                name={`available_time.${i}.days_of_week`}
                render={({ field }) => (
                  <Input {...field} value={field.value ?? ""} placeholder="mon,tue,wed,thu,fri" />
                )}
              />
            </Field>

            <FormSwitch
              control={form.control}
              name={`available_time.${i}.all_day`}
              label="Open all day"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Opens</FieldLabel>
                <Controller
                  control={form.control}
                  name={`available_time.${i}.available_start_time`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="time" step={1} />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Closes</FieldLabel>
                <Controller
                  control={form.control}
                  name={`available_time.${i}.available_end_time`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="time" step={1} />
                  )}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ))}
      {availableTime.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No hours added.</p>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Periods when the service is not available.</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => notAvailable.append({ description: "" })}
        >
          <PlusIcon data-icon="inline-start" />
          Add Period
        </Button>
      </div>

      {notAvailable.fields.map((n, i) => (
        <Card key={n.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Period {i + 1}</CardTitle>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              onClick={() => notAvailable.remove(i)}
            >
              <Trash2Icon data-icon />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-4">
            <Field data-invalid={!!e?.not_available?.[i]?.description || undefined}>
              <FieldLabel>Reason *</FieldLabel>
              <Controller
                control={form.control}
                name={`not_available.${i}.description`}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g. Public holiday closure"
                    aria-invalid={!!e?.not_available?.[i]?.description}
                  />
                )}
              />
              {e?.not_available?.[i]?.description && (
                <FieldError>{e.not_available[i].description.message}</FieldError>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>From</FieldLabel>
                <Controller
                  control={form.control}
                  name={`not_available.${i}.during_start`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="date" />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Until</FieldLabel>
                <Controller
                  control={form.control}
                  name={`not_available.${i}.during_end`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="date" />
                  )}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ))}
      {notAvailable.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No not-available periods added.</p>
      )}
    </FieldGroup>
  );
}
