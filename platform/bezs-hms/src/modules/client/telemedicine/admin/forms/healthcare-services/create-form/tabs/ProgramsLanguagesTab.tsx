/**
 * ProgramsLanguagesTab — health programs and supported communication
 * languages — both sourced live from the FHIR terminology server via
 * TerminologySelect (resource="HealthcareService").
 */

"use client";

import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { CodeableConceptRepeatableField } from "../CodeableConceptRepeatableField";

/** @see CreateHealthcareServiceForm */
export function ProgramsLanguagesTab() {
  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <CodeableConceptRepeatableField
        name="program"
        terminologyField="program"
        description="Health programs this service is part of, e.g. NHS, Medicare, NDIS."
        addLabel="Add program"
        placeholder="Search programs…"
        emptyMessage="No programs added."
      />

      <Separator />

      <CodeableConceptRepeatableField
        name="communication"
        terminologyField="communication"
        description="Languages in which the service communicates with patients."
        addLabel="Add language"
        placeholder="Search languages…"
        emptyMessage="No languages added."
      />
    </FieldGroup>
  );
}
