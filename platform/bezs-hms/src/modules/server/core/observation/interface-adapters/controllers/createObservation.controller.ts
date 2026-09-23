/**
 * createObservationController — validates input and invokes the create use case.
 *
 * Layer: server / core / observation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateObservationValidationSchema,
  type TObservationResponse,
} from "@/modules/entities/schemas/observation";
import { createObservationUseCase } from "../../application/usecases/createObservation.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TObservationResponse) {
  return data;
}

export type TCreateObservationControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createObservationUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created Observation resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createObservationController(
  input: unknown,
): Promise<TCreateObservationControllerOutput> {
  const parsed = await CreateObservationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createObservationUseCase(parsed.data);
  return presenter(data);
}
