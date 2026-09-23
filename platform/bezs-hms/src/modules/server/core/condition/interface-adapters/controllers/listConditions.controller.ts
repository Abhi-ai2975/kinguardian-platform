/**
 * listConditionsController — validates input and invokes the list use case.
 *
 * Layer: server / core / condition / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListConditionsValidationSchema,
  type TPaginatedConditionResponse,
} from "@/modules/entities/schemas/condition";
import { listConditionsUseCase } from "../../application/usecases/listConditions.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedConditionResponse) {
  return data;
}

export type TListConditionsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw query input, delegates to listConditionsUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (all fields optional).
 * @returns Paginated condition list.
 * @throws InputParseError on schema validation failure.
 */
export async function listConditionsController(
  input: unknown,
): Promise<TListConditionsControllerOutput> {
  const parsed = await ListConditionsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listConditionsUseCase(parsed.data);
  return presenter(data);
}
