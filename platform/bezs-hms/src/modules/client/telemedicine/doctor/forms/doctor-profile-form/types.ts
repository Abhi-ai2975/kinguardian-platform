/**
 * Shared prop types for the DoctorProfileForm and its sub-components.
 *
 * Layer: client / telemedicine / doctor / forms
 */

import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Props for the top-level DoctorProfileForm shell.
 * Data fetching and session context come from the server page; the form
 * owns all submission logic internally.
 */
export interface DoctorProfileFormProps {
  /** Existing practitioner record from GET /practitioners/me, or null on first setup. */
  initialPractitioner: TPractitionerResponse | null;
  /** Auth user ID — required to create the practitioner record and for getMe. */
  userId: string;
  /** Active organisation ID — required for multi-tenant practitioner creation. */
  orgId: string;
}
