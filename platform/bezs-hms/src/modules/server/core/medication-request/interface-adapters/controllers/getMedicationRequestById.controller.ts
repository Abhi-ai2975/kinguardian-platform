/**
 * getMedicationRequestByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / medication-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdMedicationRequestValidationSchema,
  type TMedicationRequestResponse,
} from "@/modules/entities/schemas/medication-request";
import { getMedicationRequestByIdUseCase } from "../../application/usecases/getMedicationRequestById.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TMedicationRequestResponse) {
  return data;
}

export type TGetMedicationRequestByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getMedicationRequestByIdUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @returns The MedicationRequest resource.
 * @throws InputParseError on schema validation failure.
 */
export async function getMedicationRequestByIdController(
  input: unknown,
): Promise<TGetMedicationRequestByIdControllerOutput> {
  const parsed = await GetByIdMedicationRequestValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getMedicationRequestByIdUseCase(parsed.data.id);
  return presenter(data);
}
