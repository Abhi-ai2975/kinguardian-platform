/**
 * createHealthcareServiceController — interface adapter for creating a HealthcareService.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 *
 * Validates the raw input against CreateHealthcareServiceValidationSchema,
 * calls the use case, and passes the result through the presenter. Throws
 * InputParseError on invalid input.
 */

import {
  CreateHealthcareServiceValidationSchema,
  THealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createHealthcareServiceUseCase } from "../../application/usecases/createHealthcareService.usecase";

/** Pass-through presenter — returns the healthcare service record as-is for now. */
function presenter(data: THealthcareServiceResponse) {
  return data;
}

export type TCreateHealthcareServiceControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates and executes a healthcare service creation.
 *
 * @param input - Raw (unknown) payload from the server action.
 * @returns The created healthcare service record.
 * @throws InputParseError on Zod validation failure.
 */
export async function createHealthcareServiceController(
  input: unknown
): Promise<TCreateHealthcareServiceControllerOutput> {
  const parsed = await CreateHealthcareServiceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createHealthcareServiceUseCase(parsed.data);
  return presenter(data);
}
