/**
 * deleteAppointmentController — validates input and invokes the delete use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteAppointmentValidationSchema } from "@/modules/entities/schemas/appointment";
import { deleteAppointmentUseCase } from "../../application/usecases/deleteAppointment.usecase";

/**
 * Parses the raw input and delegates to deleteAppointmentUseCase.
 *
 * @param input - Raw unknown value from the server action.
 * @returns void on success.
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if no appointment with that ID exists (propagated from use case).
 */
export async function deleteAppointmentController(input: unknown): Promise<void> {
  const parsed = await DeleteAppointmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteAppointmentUseCase(parsed.data.id);
}
