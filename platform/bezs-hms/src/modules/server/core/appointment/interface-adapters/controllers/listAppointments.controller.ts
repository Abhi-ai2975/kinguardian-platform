/**
 * listAppointmentsController — validates input and invokes the list use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListAppointmentsValidationSchema,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import { listAppointmentsUseCase } from "../../application/usecases/listAppointments.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedAppointmentResponse) {
  return data;
}

export type TListAppointmentsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses optional list filters and delegates to listAppointmentsUseCase.
 *
 * @param input - Raw unknown value from the server action.
 * @returns Paginated appointment list.
 * @throws InputParseError on schema validation failure.
 */
export async function listAppointmentsController(
  input: unknown,
): Promise<TListAppointmentsControllerOutput> {
  const parsed = await ListAppointmentsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listAppointmentsUseCase(parsed.data);
  return presenter(data);
}
