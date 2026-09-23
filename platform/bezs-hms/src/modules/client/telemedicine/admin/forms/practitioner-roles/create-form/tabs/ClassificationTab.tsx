/**
 * ClassificationTab — code / specialty / characteristic / communication
 * CodeableConcept arrays, each sourced live from the FHIR terminology server.
 */

"use client";

import { Separator } from "@/components/ui/separator";
import { PractitionerRoleCodeableConceptRepeatableField } from "../PractitionerRoleCodeableConceptRepeatableField";

/** @see CreatePractitionerRoleForm */
export function ClassificationTab() {
  return (
    <div className="flex flex-col gap-4 p-1 pr-3">
      <PractitionerRoleCodeableConceptRepeatableField
        name="code"
        terminologyField="code"
        description="Roles this practitioner performs (e.g. doctor, nurse)."
        addLabel="Add Code"
        placeholder="Search role code…"
        emptyMessage="No codes added."
      />

      <Separator />

      <PractitionerRoleCodeableConceptRepeatableField
        name="specialty"
        terminologyField="specialty"
        description="Clinical specialties for this role."
        addLabel="Add Specialty"
        placeholder="Search specialty…"
        emptyMessage="No specialties added."
      />

      <Separator />

      <PractitionerRoleCodeableConceptRepeatableField
        name="characteristic"
        terminologyField="characteristic"
        description="Additional characteristics of this role. Binding unverified — falls back to a free search if the terminology server returns no results."
        addLabel="Add Characteristic"
        placeholder="Search characteristic…"
        emptyMessage="No characteristics added."
      />

      <Separator />

      <PractitionerRoleCodeableConceptRepeatableField
        name="communication"
        terminologyField="communication"
        description="Languages this practitioner can communicate in for this role. Binding unverified — falls back to a free search if the terminology server returns no results."
        addLabel="Add Language"
        placeholder="Search language…"
        emptyMessage="No languages added."
      />
    </div>
  );
}
