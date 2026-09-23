/**
 * getHealthcareServiceByIdController — interface adapter for fetching a single HealthcareService.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetHealthcareServiceByIdValidationSchema,
  THealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getHealthcareServiceByIdUseCase } from "../../application/usecases/getHealthcareServiceById.usecase";

function presenter(data: THealthcareServiceResponse) {
  return data;
}

export type TGetHealthcareServiceByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and fetches the matching healthcare service.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @returns The healthcare service record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getHealthcareServiceByIdController(
  input: unknown
): Promise<TGetHealthcareServiceByIdControllerOutput> {
  const parsed = await GetHealthcareServiceByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getHealthcareServiceByIdUseCase(parsed.data.id);
  return presenter(data);
}
