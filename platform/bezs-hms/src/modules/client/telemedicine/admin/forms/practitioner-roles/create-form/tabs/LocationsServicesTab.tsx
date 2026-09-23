/**
 * LocationsServicesTab — the Location(s) and HealthcareService(s) this
 * practitioner role is associated with.
 */

"use client";

import { PractitionerRoleReferenceRepeatableField } from "../PractitionerRoleReferenceRepeatableField";
import { searchLocationOptions } from "../../../../queries/location.queries";
import { searchHealthcareServiceOptions } from "../../../../queries/healthcare-service.queries";
import { useAdminStore } from "../../../../stores/admin.store";

/** @see CreatePractitionerRoleForm */
export function LocationsServicesTab() {
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);

  return (
    <div className="flex flex-col gap-6 p-1 pr-3">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Locations</p>
        <PractitionerRoleReferenceRepeatableField
          name="location"
          resourceTypePrefix="Location"
          fetchOptions={(q) => searchLocationOptions(q, orgId)}
          queryKey={["locations", "picker", orgId]}
          addLabel="Add Location"
          emptyMessage="No locations added."
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Healthcare Services</p>
        <PractitionerRoleReferenceRepeatableField
          name="healthcare_service"
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
