/**
 * deleteAppointmentUseCase — deletes an Appointment by ID.
 *
 * Layer: server / core / appointment / application / usecases
 *
 * Delegates to IAppointmentService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Removes an Appointment and all its child records.
 *
 * @param id - The Appointment's fhir-gql database ID.
 * @returns void on success.
 * @throws NotFoundError if no appointment with that ID exists.
 */
export async function deleteAppointmentUseCase(id: number): Promise<void> {
  return getInjection("IAppointmentService").delete(id);
}
