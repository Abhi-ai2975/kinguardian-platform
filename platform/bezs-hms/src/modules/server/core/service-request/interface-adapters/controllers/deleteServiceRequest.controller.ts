/**
 * deleteServiceRequestController — validates input and invokes the delete use case.
 *
 * Layer: server / core / service-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteServiceRequestValidationSchema } from "@/modules/entities/schemas/service-request";
import { deleteServiceRequestUseCase } from "../../application/usecases/deleteServiceRequest.usecase";

/**
 * Parses the raw input and delegates to deleteServiceRequestUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteServiceRequestController(input: unknown): Promise<void> {
  const parsed = await DeleteServiceRequestValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteServiceRequestUseCase(parsed.data.id);
}
