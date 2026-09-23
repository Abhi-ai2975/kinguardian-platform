/**
 * updateAppointmentUseCase — partially updates scalar fields on an Appointment.
 *
 * Layer: server / core / appointment / application / usecases
 *
 * Delegates to IAppointmentService resolved from the DI container.
 * Child arrays cannot be updated in-place; only scalar fields are patchable.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TUpdateAppointment,
  type TAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/**
 * Patches scalars on an Appointment (status, dates, cancellation, priority).
 *
 * @param id - The Appointment's fhir-gql database ID.
 * @param dto - Scalar patch payload (id field excluded).
 * @returns The updated Appointment resource.
 */
export async function updateAppointmentUseCase(
  id: number,
  dto: Omit<TUpdateAppointment, "id">,
): Promise<TAppointmentResponse> {
  return getInjection("IAppointmentService").update(id, dto);
}
