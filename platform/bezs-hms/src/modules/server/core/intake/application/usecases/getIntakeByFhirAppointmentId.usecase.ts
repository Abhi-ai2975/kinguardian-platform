/**
 * getIntakeByFhirAppointmentId use case.
 *
 * Layer: server / core / intake / application
 *
 * Doctor-side lookup: retrieves the intake session linked to a FHIR appointment.
 * Returns null when the appointment was booked without a prior intake.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";

/**
 * @param fhirAppointmentId - FHIR Appointment.id (integer).
 * @returns Linked Intake or null.
 */
export async function getIntakeByFhirAppointmentIdUseCase(
  fhirAppointmentId: number,
): Promise<TIntakeResponse | null> {
  const repo = getInjection("IIntakeRepository");
  return repo.getByFhirAppointmentId(fhirAppointmentId);
}
