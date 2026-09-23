/**
 * PhotoSection — thin wrapper around DoctorProfilePhotoUpload for the admin
 * Edit Practitioner Sheet.
 *
 * Layer: client / telemedicine / admin / forms / practitioners
 *
 * DoctorProfilePhotoUpload is already fully generic (practitionerId,
 * existingPhotoItemId, initialFileId, displayName are all plain props — it's
 * not tied to the signed-in user's own session), so this reuses it directly
 * rather than duplicating ~300 lines of FileNest upload + presigned-URL
 * mechanics. `addPractitionerPhotoAction`/`patchPractitionerPhotoAction`
 * stayed on `authenticatedProcedure` (real self-service consumer), so
 * calling them from the admin context is unaffected.
 *
 * Must be rendered inside a <FileNestProvider> (set up in EditPractitionerModal).
 */

"use client";

import { DoctorProfilePhotoUpload } from "@/modules/client/telemedicine/doctor/component/profile/DoctorProfilePhotoUpload";
import { practitionerLabel } from "../../../queries/practitioner.queries";
import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

interface PhotoSectionProps {
  practitioner: TPractitionerResponse;
}

/** Renders the reusable photo upload widget scoped to an admin-selected practitioner. */
export function PhotoSection({ practitioner }: PhotoSectionProps) {
  const existingPhoto = practitioner.photo?.[0];

  return (
    <div className="p-1 pr-3">
      <DoctorProfilePhotoUpload
        practitionerId={practitioner.id}
        existingPhotoItemId={existingPhoto?.id}
        initialFileId={existingPhoto?.url ?? undefined}
        displayName={practitionerLabel(practitioner)}
      />
    </div>
  );
}
