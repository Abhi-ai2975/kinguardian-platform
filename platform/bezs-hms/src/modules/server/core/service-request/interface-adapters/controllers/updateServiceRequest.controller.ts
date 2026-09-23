/**
 * updateServiceRequestController — validates input and invokes the update use case.
 *
 * Layer: server / core / service-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateServiceRequestValidationSchema,
  type TServiceRequestResponse,
} from "@/modules/entities/schemas/service-request";
import { updateServiceRequestUseCase } from "../../application/usecases/updateServiceRequest.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TServiceRequestResponse) {
  return data;
}

export type TUpdateServiceRequestControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, strips `id` into a separate arg, and delegates to updateServiceRequestUseCase.
 *
 * @param input - Raw unknown value from the server action (id + scalar patch fields).
 * @returns The updated ServiceRequest resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updateServiceRequestController(
  input: unknown,
): Promise<TUpdateServiceRequestControllerOutput> {
  const parsed = await UpdateServiceRequestValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateServiceRequestUseCase(id, dto);
  return presenter(data);
}
