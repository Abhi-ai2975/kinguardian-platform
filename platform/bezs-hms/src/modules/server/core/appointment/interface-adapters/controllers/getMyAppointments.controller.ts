/**
 * getMyAppointmentsController — validates input and invokes the getMe use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 *
 * userId is extracted directly from the server action's session context and passed
 * as a separate argument — it is never derived from client-supplied input to prevent
 * tenant data leakage.
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetMyAppointmentsValidationSchema,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import { getMyAppointmentsUseCase } from "../../application/usecases/getMyAppointments.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedAppointmentResponse) {
  return data;
}

export type TGetMyAppointmentsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the full input object (which includes the session-injected userId),
 * then delegates to getMyAppointmentsUseCase.
 *
 * @param input - Raw unknown value; must include userId (injected by action from session).
 * @returns Paginated appointment list for the authenticated user.
 * @throws InputParseError on schema validation failure.
 */
export async function getMyAppointmentsController(
  input: unknown,
): Promise<TGetMyAppointmentsControllerOutput> {
  const parsed = await GetMyAppointmentsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { userId, ...query } = parsed.data;
  const data = await getMyAppointmentsUseCase(userId, query);
  return presenter(data);
}
