/**
 * createServiceRequestController — validates input and invokes the create use case.
 *
 * Layer: server / core / service-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateServiceRequestValidationSchema,
  type TServiceRequestResponse,
} from "@/modules/entities/schemas/service-request";
import { createServiceRequestUseCase } from "../../application/usecases/createServiceRequest.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TServiceRequestResponse) {
  return data;
}

export type TCreateServiceRequestControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createServiceRequestUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created ServiceRequest resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createServiceRequestController(
  input: unknown,
): Promise<TCreateServiceRequestControllerOutput> {
  const parsed = await CreateServiceRequestValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createServiceRequestUseCase(parsed.data);
  return presenter(data);
}
