/**
 * updateMedicationRequestController — validates input and invokes the update use case.
 *
 * Layer: server / core / medication-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateMedicationRequestValidationSchema,
  type TMedicationRequestResponse,
} from "@/modules/entities/schemas/medication-request";
import { updateMedicationRequestUseCase } from "../../application/usecases/updateMedicationRequest.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TMedicationRequestResponse) {
  return data;
}

export type TUpdateMedicationRequestControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, strips `id` into a separate arg, and delegates to updateMedicationRequestUseCase.
 *
 * @param input - Raw unknown value from the server action (id + scalar patch fields).
 * @returns The updated MedicationRequest resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updateMedicationRequestController(
  input: unknown,
): Promise<TUpdateMedicationRequestControllerOutput> {
  const parsed = await UpdateMedicationRequestValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateMedicationRequestUseCase(id, dto);
  return presenter(data);
}
