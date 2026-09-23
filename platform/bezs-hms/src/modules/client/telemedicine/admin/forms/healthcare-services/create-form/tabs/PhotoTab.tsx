/**
 * PhotoTab — representative photo for the healthcare service, via FileNest.
 *
 * Requires the surrounding Sheet to be wrapped in a <FileNestProvider> —
 * see CreateHealthcareServiceModal.tsx / EditHealthcareServiceModal.tsx.
 */

"use client";

import { FieldGroup } from "@/components/ui/field";
import { HealthcareServicePhotoUpload } from "../../HealthcareServicePhotoUpload";

/** @see CreateHealthcareServiceForm */
export function PhotoTab() {
  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <p className="text-sm text-muted-foreground">
        A representative photo for this service (clinic photo, logo, etc.).
      </p>
      <HealthcareServicePhotoUpload />
    </FieldGroup>
  );
}
