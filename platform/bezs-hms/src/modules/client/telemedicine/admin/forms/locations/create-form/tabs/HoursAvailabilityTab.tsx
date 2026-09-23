/**
 * HoursAvailabilityTab — operating hours, availability exceptions, and
 * geographic position (longitude/latitude/altitude) for the location.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { FormInput, FormSwitch } from "@/modules/client/shared/components/CustomFormFields";
import type { TCreateLocationFormSchema } from "@/modules/entities/schemas/location";

/** @see CreateLocationForm */
export function HoursAvailabilityTab() {
  const form = useFormContext<TCreateLocationFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "hours_of_operation",
  });

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Normal operating hours for this location.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Hours
        </Button>
      </div>

      {fields.map((h, i) => (
        <Card key={h.id}>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
            <CardTitle className="text-sm">Hours {i + 1}</CardTitle>
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
              <FieldLabel>Days of Week</FieldLabel>
              <Controller
                control={form.control}
                name={`hours_of_operation.${i}.days_of_week`}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="mon,tue,wed,thu,fri"
                  />
                )}
              />
            </Field>

            <FormSwitch
              control={form.control}
              name={`hours_of_operation.${i}.all_day`}
              label="Open all day"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Opening Time</FieldLabel>
                <Controller
                  control={form.control}
                  name={`hours_of_operation.${i}.opening_time`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="time" step={1} />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Closing Time</FieldLabel>
                <Controller
                  control={form.control}
                  name={`hours_of_operation.${i}.closing_time`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} type="time" step={1} />
                  )}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No hours added.</p>
      )}

      <Separator />

      <FormInput
        control={form.control}
        name="availability_exceptions"
        label="Availability Exceptions"
        placeholder="Closed on public holidays"
      />

      <Separator />

      <p className="text-sm text-muted-foreground">Geographic position (WGS84).</p>
      <div className="grid grid-cols-3 gap-3">
        <Field>
          <FieldLabel>Longitude</FieldLabel>
          <Controller
            control={form.control}
            name="position_longitude"
            render={({ field }) => (
              <Input
                type="number"
                step="any"
                value={field.value ?? ""}
                onChange={(ev) =>
                  field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                }
                placeholder="-89.6501481"
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel>Latitude</FieldLabel>
          <Controller
            control={form.control}
            name="position_latitude"
            render={({ field }) => (
              <Input
                type="number"
                step="any"
                value={field.value ?? ""}
                onChange={(ev) =>
                  field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                }
                placeholder="39.7817213"
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel>Altitude</FieldLabel>
          <Controller
            control={form.control}
            name="position_altitude"
            render={({ field }) => (
              <Input
                type="number"
                step="any"
                value={field.value ?? ""}
                onChange={(ev) =>
                  field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                }
                placeholder="180"
              />
            )}
          />
        </Field>
      </div>
    </FieldGroup>
  );
}
