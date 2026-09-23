/**
 * getObservationByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / observation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdObservationValidationSchema,
  type TObservationResponse,
} from "@/modules/entities/schemas/observation";
import { getObservationByIdUseCase } from "../../application/usecases/getObservationById.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TObservationResponse) {
  return data;
}

export type TGetObservationByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getObservationByIdUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @returns The Observation resource.
 * @throws InputParseError on schema validation failure.
 */
export async function getObservationByIdController(
  input: unknown,
): Promise<TGetObservationByIdControllerOutput> {
  const parsed = await GetByIdObservationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getObservationByIdUseCase(parsed.data.id);
  return presenter(data);
}
