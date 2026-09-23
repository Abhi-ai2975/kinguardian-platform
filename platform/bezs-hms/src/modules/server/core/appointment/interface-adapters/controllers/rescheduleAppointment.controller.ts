/**
 * rescheduleAppointmentController — validates input and invokes the reschedule use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  RescheduleAppointmentValidationSchema,
  type TAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import { rescheduleAppointmentUseCase } from "../../application/usecases/rescheduleAppointment.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TAppointmentResponse) {
  return data;
}

export type TRescheduleAppointmentControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses raw input, delegates to rescheduleAppointmentUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action ({ id, new_slot_id }).
 * @returns The updated Appointment.
 * @throws InputParseError on schema validation failure.
 * @throws ConflictError if the new slot is no longer free (propagated from use case).
 */
export async function rescheduleAppointmentController(
  input: unknown,
): Promise<TRescheduleAppointmentControllerOutput> {
  const parsed = await RescheduleAppointmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await rescheduleAppointmentUseCase(parsed.data.id, parsed.data.new_slot_id);
  return presenter(data);
}
