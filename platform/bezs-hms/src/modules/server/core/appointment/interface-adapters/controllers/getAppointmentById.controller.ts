/**
 * getAppointmentByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdAppointmentValidationSchema,
  type TAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import { getAppointmentByIdUseCase } from "../../application/usecases/getAppointmentById.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TAppointmentResponse) {
  return data;
}

export type TGetAppointmentByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getAppointmentByIdUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The Appointment resource.
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if no appointment with that ID exists (propagated from use case).
 */
export async function getAppointmentByIdController(
  input: unknown,
): Promise<TGetAppointmentByIdControllerOutput> {
  const parsed = await GetByIdAppointmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getAppointmentByIdUseCase(parsed.data.id);
  return presenter(data);
}
