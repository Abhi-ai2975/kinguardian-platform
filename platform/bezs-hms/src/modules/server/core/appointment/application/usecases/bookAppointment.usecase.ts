/**
 * bookAppointmentUseCase — atomically books an appointment via the /book endpoint.
 *
 * Layer: server / core / appointment / application / usecases
 *
 * Delegates to IAppointmentService resolved from the DI container.
 * Returns 409 ConflictError if the slot is no longer free.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TBookAppointment,
  type TAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/**
 * Books an appointment via the simplified /book endpoint.
 * fhir-gql links the slot, builds participants, and marks it busy atomically.
 *
 * @param dto - Booking payload (practitioner_id, slot_id, patient_id + optional metadata).
 * @returns The newly created Appointment.
 * @throws ConflictError if the slot has already been claimed (HTTP 409).
 */
export async function bookAppointmentUseCase(
  dto: TBookAppointment,
): Promise<TAppointmentResponse> {
  return getInjection("IAppointmentService").book(dto);
}
