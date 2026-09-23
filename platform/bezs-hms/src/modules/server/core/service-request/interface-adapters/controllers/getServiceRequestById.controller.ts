/**
 * getServiceRequestByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / service-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdServiceRequestValidationSchema,
  type TServiceRequestResponse,
} from "@/modules/entities/schemas/service-request";
import { getServiceRequestByIdUseCase } from "../../application/usecases/getServiceRequestById.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TServiceRequestResponse) {
  return data;
}

export type TGetServiceRequestByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getServiceRequestByIdUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @returns The ServiceRequest resource.
 * @throws InputParseError on schema validation failure.
 */
export async function getServiceRequestByIdController(
  input: unknown,
): Promise<TGetServiceRequestByIdControllerOutput> {
  const parsed = await GetByIdServiceRequestValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getServiceRequestByIdUseCase(parsed.data.id);
  return presenter(data);
}
