/**
 * AvailabilityCard — nested available_times[]/not_available_times[] field
 * arrays for a single availability container.
 *
 * Extracted as its own component so it can call useFieldArray with the
 * parent form's control without violating the rules-of-hooks inside a
 * .map() loop — same pattern as Organization's ContactTelecomRows.
 *
 * Used exclusively by AvailabilityTab.
 */

"use client";

import { useFieldArray, Controller, Control } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { FormSwitch } from "@/modules/client/shared/components/CustomFormFields";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

interface AvailabilityCardProps {
  /** Index of this availability container in the top-level `availability` field array. */
  index: number;
  /** react-hook-form control from the parent form. */
  control: Control<TCreatePractitionerRoleFormSchema>;
  /** Removes this availability container from the parent field array. */
  onRemove: () => void;
}

/**
 * Renders one availability container: a repeatable list of available-time
 * windows plus a repeatable list of not-available-time blocks.
 * Scoped field array names: `availability.{index}.available_times` and
 * `availability.{index}.not_available_times`.
 */
export function AvailabilityCard({ index, control, onRemove }: AvailabilityCardProps) {
  const availableTimes = useFieldArray({
    control,
    name: `availability.${index}.available_times` as const,
  });
  const notAvailableTimes = useFieldArray({
    control,
    name: `availability.${index}.not_available_times` as const,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
        <CardTitle className="text-sm">Availability {index + 1}</CardTitle>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-destructive"
          onClick={onRemove}
        >
          <Trash2Icon data-icon />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-4">
        {/* Available times */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Available Times
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => availableTimes.append({})}
            >
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
          </div>

          {availableTimes.fields.map((t, ti) => (
            <div key={t.id} className="flex flex-col gap-2 rounded-md border p-3">
              <Field>
                <FieldLabel>Days of Week</FieldLabel>
                <Controller
                  control={control}
                  name={`availability.${index}.available_times.${ti}.days_of_week`}
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
                control={control}
                name={`availability.${index}.available_times.${ti}.all_day`}
                label="All day"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Start Time</FieldLabel>
                  <Controller
                    control={control}
                    name={`availability.${index}.available_times.${ti}.available_start_time`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} type="time" step={1} />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>End Time</FieldLabel>
                  <Controller
                    control={control}
                    name={`availability.${index}.available_times.${ti}.available_end_time`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} type="time" step={1} />
                    )}
                  />
                </Field>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="self-end text-destructive"
                onClick={() => availableTimes.remove(ti)}
              >
                <Trash2Icon data-icon="inline-start" />
                Remove
              </Button>
            </div>
          ))}

          {availableTimes.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">No available-time windows added.</p>
          )}
        </div>

        <Separator />

        {/* Not-available times */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Not-Available Times
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => notAvailableTimes.append({})}
            >
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
          </div>

          {notAvailableTimes.fields.map((t, ti) => (
            <div key={t.id} className="flex flex-col gap-2 rounded-md border p-3">
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Controller
                  control={control}
                  name={`availability.${index}.not_available_times.${ti}.description`}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ""} placeholder="Annual leave" />
                  )}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>During Start</FieldLabel>
                  <Controller
                    control={control}
                    name={`availability.${index}.not_available_times.${ti}.during_start`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} type="date" />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>During End</FieldLabel>
                  <Controller
                    control={control}
                    name={`availability.${index}.not_available_times.${ti}.during_end`}
                    render={({ field }) => (
                      <Input {...field} value={field.value ?? ""} type="date" />
                    )}
                  />
                </Field>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="self-end text-destructive"
                onClick={() => notAvailableTimes.remove(ti)}
              >
                <Trash2Icon data-icon="inline-start" />
                Remove
              </Button>
            </div>
          ))}

          {notAvailableTimes.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">No not-available blocks added.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
