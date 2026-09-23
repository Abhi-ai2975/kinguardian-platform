/**
 * createAppointmentController — validates input and invokes the create use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateAppointmentValidationSchema,
  type TAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import { createAppointmentUseCase } from "../../application/usecases/createAppointment.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TAppointmentResponse) {
  return data;
}

export type TCreateAppointmentControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createAppointmentUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created Appointment resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createAppointmentController(
  input: unknown,
): Promise<TCreateAppointmentControllerOutput> {
  const parsed = await CreateAppointmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createAppointmentUseCase(parsed.data);
  return presenter(data);
}
