/**
 * listPractitionerRolesForBookingController — validates input and invokes the booking list use case.
 *
 * Layer: server / core / practitioner-role / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListPractitionerRolesForBookingValidationSchema,
  type TPaginatedPractitionerRoleBookingResponse,
} from "@/modules/entities/schemas/practitioner-role";
import { listPractitionerRolesForBookingUseCase } from "../../application/usecases/listPractitionerRolesForBooking.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedPractitionerRoleBookingResponse) {
  return data;
}

export type TListPractitionerRolesForBookingControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to listPractitionerRolesForBookingUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (booking query params).
 * @returns Paginated booking-enriched PractitionerRole list.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerRolesForBookingController(
  input: unknown,
): Promise<TListPractitionerRolesForBookingControllerOutput> {
  const parsed = await ListPractitionerRolesForBookingValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerRolesForBookingUseCase(parsed.data);
  return presenter(data);
}
