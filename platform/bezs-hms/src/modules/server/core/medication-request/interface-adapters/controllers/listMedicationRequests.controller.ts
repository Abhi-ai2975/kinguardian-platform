/**
 * listMedicationRequestsController — validates input and invokes the list use case.
 *
 * Layer: server / core / medication-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListMedicationRequestsValidationSchema,
  type TPaginatedMedicationRequestResponse,
} from "@/modules/entities/schemas/medication-request";
import { listMedicationRequestsUseCase } from "../../application/usecases/listMedicationRequests.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedMedicationRequestResponse) {
  return data;
}

export type TListMedicationRequestsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw query input, delegates to listMedicationRequestsUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (all fields optional).
 * @returns Paginated medication request list.
 * @throws InputParseError on schema validation failure.
 */
export async function listMedicationRequestsController(
  input: unknown,
): Promise<TListMedicationRequestsControllerOutput> {
  const parsed = await ListMedicationRequestsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listMedicationRequestsUseCase(parsed.data);
  return presenter(data);
}
