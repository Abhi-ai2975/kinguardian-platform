/**
 * bookAppointmentController — validates input and invokes the book use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  BookAppointmentValidationSchema,
  type TAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import { bookAppointmentUseCase } from "../../application/usecases/bookAppointment.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TAppointmentResponse) {
  return data;
}

export type TBookAppointmentControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to bookAppointmentUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The newly created Appointment.
 * @throws InputParseError on schema validation failure.
 * @throws ConflictError if the slot is no longer free (propagated from use case).
 */
export async function bookAppointmentController(
  input: unknown,
): Promise<TBookAppointmentControllerOutput> {
  const parsed = await BookAppointmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await bookAppointmentUseCase(parsed.data);
  return presenter(data);
}
