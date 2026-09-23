/**
 * listServiceRequestsController — validates input and invokes the list use case.
 *
 * Layer: server / core / service-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListServiceRequestsValidationSchema,
  type TPaginatedServiceRequestResponse,
} from "@/modules/entities/schemas/service-request";
import { listServiceRequestsUseCase } from "../../application/usecases/listServiceRequests.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedServiceRequestResponse) {
  return data;
}

export type TListServiceRequestsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw query input, delegates to listServiceRequestsUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (all fields optional).
 * @returns Paginated service request list.
 * @throws InputParseError on schema validation failure.
 */
export async function listServiceRequestsController(
  input: unknown,
): Promise<TListServiceRequestsControllerOutput> {
  const parsed = await ListServiceRequestsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listServiceRequestsUseCase(parsed.data);
  return presenter(data);
}
