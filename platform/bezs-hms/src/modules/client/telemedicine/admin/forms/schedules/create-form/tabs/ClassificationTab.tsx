/**
 * ClassificationTab — specialty / service type / service category
 * CodeableConcept arrays, each sourced live from the FHIR terminology server.
 */

"use client";

import { Separator } from "@/components/ui/separator";
import { ScheduleCodeableConceptRepeatableField } from "../ScheduleCodeableConceptRepeatableField";

/** @see CreateScheduleForm */
export function ClassificationTab() {
  return (
    <div className="flex flex-col gap-4 p-1 pr-3">
      <ScheduleCodeableConceptRepeatableField
        name="specialty"
        terminologyField="specialty"
        description="Clinical specialties covered by this schedule."
        addLabel="Add Specialty"
        placeholder="Search specialty…"
        emptyMessage="No specialties added."
      />

      <Separator />

      <ScheduleCodeableConceptRepeatableField
        name="service_type"
        terminologyField="serviceType"
        description="Specific services offered under this schedule."
        addLabel="Add Service Type"
        placeholder="Search service type…"
        emptyMessage="No service types added."
      />

      <Separator />

      <ScheduleCodeableConceptRepeatableField
        name="service_category"
        terminologyField="serviceCategory"
        description="Broad service categories for this schedule. Binding unverified — falls back to a free search if the terminology server returns no results."
        addLabel="Add Service Category"
        placeholder="Search service category…"
        emptyMessage="No service categories added."
      />
    </div>
  );
}
