/**
 * ClassificationTab — specialty / service type / service category
 * CodeableConcept arrays for the manual one-off slot.
 */

"use client";

import { useFormContext } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { SlotCodeableConceptRepeatableField } from "../../SlotCodeableConceptRepeatableField";
import type { TCreateSlotFormSchema } from "@/modules/entities/schemas/slot";

/** @see CreateSlotForm */
export function ClassificationTab() {
  const form = useFormContext<TCreateSlotFormSchema>();

  return (
    <div className="flex flex-col gap-4 p-1 pr-3">
      <SlotCodeableConceptRepeatableField
        control={form.control}
        name="specialty"
        terminologyField="specialty"
        description="Clinical specialties this slot applies to."
        addLabel="Add Specialty"
        placeholder="Search specialty…"
        emptyMessage="No specialties added."
      />

      <Separator />

      <SlotCodeableConceptRepeatableField
        control={form.control}
        name="service_type"
        terminologyField="serviceType"
        description="Specific service offered in this slot."
        addLabel="Add Service Type"
        placeholder="Search service type…"
        emptyMessage="No service types added."
      />

      <Separator />

      <SlotCodeableConceptRepeatableField
        control={form.control}
        name="service_category"
        terminologyField="serviceCategory"
        description="Broad service category for this slot. Binding unverified — falls back to a free search if the terminology server returns no results."
        addLabel="Add Service Category"
        placeholder="Search service category…"
        emptyMessage="No service categories added."
      />
    </div>
  );
}
