/**
 * updateAppointmentController — validates input and invokes the update use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateAppointmentValidationSchema,
  type TAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import { updateAppointmentUseCase } from "../../application/usecases/updateAppointment.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TAppointmentResponse) {
  return data;
}

export type TUpdateAppointmentControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to updateAppointmentUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The updated Appointment resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updateAppointmentController(
  input: unknown,
): Promise<TUpdateAppointmentControllerOutput> {
  const parsed = await UpdateAppointmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateAppointmentUseCase(id, dto);
  return presenter(data);
}
