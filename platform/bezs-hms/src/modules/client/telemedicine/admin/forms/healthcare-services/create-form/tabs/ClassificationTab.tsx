/**
 * ClassificationTab — category, service type, specialty, and service
 * provision code — all sourced live from the FHIR terminology server via
 * TerminologySelect (resource="HealthcareService", the same bindings the
 * A2UI create_healthcare_service workflow uses).
 */

"use client";

import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { CodeableConceptRepeatableField } from "../CodeableConceptRepeatableField";

/** @see CreateHealthcareServiceForm */
export function ClassificationTab() {
  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <CodeableConceptRepeatableField
        name="category"
        terminologyField="category"
        description="Broad category(s) of service, e.g. General Practice."
        addLabel="Add category"
        placeholder="Search categories…"
        emptyMessage="No categories added."
      />

      <Separator />

      <CodeableConceptRepeatableField
        name="type"
        terminologyField="type"
        description="Specific type(s) of service being delivered."
        addLabel="Add service type"
        placeholder="Search service types…"
        emptyMessage="No service types added."
      />

      <Separator />

      <CodeableConceptRepeatableField
        name="specialty"
        terminologyField="specialty"
        description="Clinical specialty(s) associated with the service."
        addLabel="Add specialty"
        placeholder="Search specialties…"
        emptyMessage="No specialties added."
      />

      <Separator />

      <CodeableConceptRepeatableField
        name="service_provision_code"
        terminologyField="serviceProvisionCode"
        description="Conditions under which the service is available (free, discounted, private-pay)."
        addLabel="Add provision code"
        placeholder="Search provision codes…"
        emptyMessage="No provision codes added."
      />
    </FieldGroup>
  );
}
