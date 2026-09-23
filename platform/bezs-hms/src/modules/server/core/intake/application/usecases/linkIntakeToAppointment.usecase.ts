/**
 * linkIntakeToAppointment use case.
 *
 * Layer: server / core / intake / application
 *
 * Associates a completed intake session with the FHIR appointment the patient
 * subsequently booked. Called immediately after a successful bookAppointmentAction
 * when an intake_id was present in the booking request.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TLinkIntake, TIntakeResponse } from "@/modules/entities/schemas/intake";

/**
 * @param dto - id (Intake.id), fhir_appointment_id (FHIR Appointment.id).
 * @returns Updated Intake record with fhir_appointment_id set.
 */
export async function linkIntakeToAppointmentUseCase(dto: TLinkIntake): Promise<TIntakeResponse> {
  const repo = getInjection("IIntakeRepository");
  return repo.linkToAppointment(dto);
}
