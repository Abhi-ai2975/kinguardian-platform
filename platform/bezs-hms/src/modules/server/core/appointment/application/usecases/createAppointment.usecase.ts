/**
 * createAppointmentUseCase — creates a full FHIR Appointment resource.
 *
 * Layer: server / core / appointment / application / usecases
 *
 * Delegates to IAppointmentService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreateAppointment,
  type TAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/**
 * Creates a new Appointment with all optional child arrays.
 * status and participant (≥1) are required.
 *
 * @param dto - Creation payload validated by CreateAppointmentValidationSchema.
 * @returns The created Appointment resource.
 */
export async function createAppointmentUseCase(
  dto: TCreateAppointment,
): Promise<TAppointmentResponse> {
  return getInjection("IAppointmentService").create(dto);
}
