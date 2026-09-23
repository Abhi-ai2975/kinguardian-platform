/**
 * getAppointmentByIdUseCase — fetches a single Appointment by ID.
 *
 * Layer: server / core / appointment / application / usecases
 *
 * Delegates to IAppointmentService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TAppointmentResponse } from "@/modules/entities/schemas/appointment";

/**
 * Returns a single Appointment with all embedded child arrays.
 *
 * @param id - The Appointment's fhir-gql database ID.
 * @returns The Appointment resource.
 * @throws NotFoundError if no appointment with that ID exists.
 */
export async function getAppointmentByIdUseCase(id: number): Promise<TAppointmentResponse> {
  return getInjection("IAppointmentService").getById(id);
}
