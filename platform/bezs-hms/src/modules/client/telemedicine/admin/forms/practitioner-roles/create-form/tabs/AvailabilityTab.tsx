/**
 * AvailabilityTab — availability containers, each grouping available-time
 * windows and not-available-time blocks. Mirrors Location's
 * HoursAvailabilityTab pattern, extended with a second nested array per
 * entry (not_available_times) via AvailabilityCard.
 */

"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";
import { AvailabilityCard } from "../AvailabilityCard";

/** @see CreatePractitionerRoleForm */
export function AvailabilityTab() {
  const form = useFormContext<TCreatePractitionerRoleFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "availability",
  });

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Availability windows for this role.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
          <PlusIcon data-icon="inline-start" />
          Add Availability
        </Button>
      </div>

      {fields.map((item, i) => (
        <AvailabilityCard
          key={item.id}
          index={i}
          control={form.control}
          onRemove={() => remove(i)}
        />
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No availability added.</p>
      )}
    </div>
  );
}
