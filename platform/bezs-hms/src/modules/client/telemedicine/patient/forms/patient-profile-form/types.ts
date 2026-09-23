/**
 * Shared prop types for the PatientProfileForm and its sub-components.
 *
 * Layer: client / telemedicine / patient / forms
 */

import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * Props for the top-level PatientProfileForm shell.
 * Data fetching and session context come from the server page; the form
 * owns all submission logic internally.
 */
export interface PatientProfileFormProps {
  /** Existing patient record from GET /patients/me, or null on first setup. */
  initialPatient: TPatientResponse | null;
  /** Auth user ID — required to create the patient record. */
  userId: string;
  /** Active organisation ID — required for multi-tenant patient creation. */
  orgId: string;
}
