/**
 * ActorsTab — the resources this Schedule provides availability for, split
 * into 3 typed groups matching the A2UI reference form's RepeatableGroups.
 *
 * FHIR technically allows Patient/Practitioner/RelatedPerson/Device too, but
 * the admin UI only surfaces the 3 practically-scheduled actor types. Each
 * row's reference is searched live via ReferenceSelect, scoped to the
 * session's active tenant.
 */

"use client";

import { ActorRepeatableField } from "../ActorRepeatableField";
import { searchPractitionerRoleOptions } from "../../../../queries/practitioner-role.queries";
import { searchLocationOptions } from "../../../../queries/location.queries";
import { searchHealthcareServiceOptions } from "../../../../queries/healthcare-service.queries";
import { useAdminStore } from "../../../../stores/admin.store";

/** @see CreateScheduleForm */
export function ActorsTab() {
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);

  return (
    <div className="flex flex-col gap-6 p-1 pr-3">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Practitioner Roles</p>
        <ActorRepeatableField
          name="practitioner_roles"
          resourceTypePrefix="PractitionerRole"
          fetchOptions={(q) => searchPractitionerRoleOptions(q, orgId)}
          queryKey={["practitioner-roles", "picker", orgId]}
          addLabel="Add Practitioner Role"
          emptyMessage="No practitioner roles added."
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Locations</p>
        <ActorRepeatableField
          name="locations"
          resourceTypePrefix="Location"
          fetchOptions={(q) => searchLocationOptions(q, orgId)}
          queryKey={["locations", "picker", orgId]}
          addLabel="Add Location"
          emptyMessage="No locations added."
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Healthcare Services</p>
        <ActorRepeatableField
          name="healthcare_services"
          resourceTypePrefix="HealthcareService"
          fetchOptions={(q) => searchHealthcareServiceOptions(q)}
          queryKey={["healthcare-services", "picker"]}
          addLabel="Add Healthcare Service"
          emptyMessage="No healthcare services added."
        />
      </div>
    </div>
  );
}
