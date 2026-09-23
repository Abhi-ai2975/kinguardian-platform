/**
 * listConsultations controller.
 *
 * Layer: server / core / consultation / interface-adapters / controllers
 *
 * Validates the list query, delegates to listConsultationsUseCase, and passes
 * the paginated result through the presenter unchanged.
 */

import {
  ListConsultationsValidationSchema,
  type TPaginatedConsultationResponse,
} from "@/modules/entities/schemas/consultation";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listConsultationsUseCase } from "../../application/usecases/listConsultations.usecase";

/** @private Presenter — returns the paginated result as-is. */
function presenter(data: TPaginatedConsultationResponse) {
  return data;
}

/** Return type inferred from presenter for use in the ZSA action handler type. */
export type TListConsultationsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the list query and returns a paginated consultation list.
 *
 * @param input - Raw filter/pagination payload.
 * @returns Paginated consultation response.
 * @throws InputParseError if the query is malformed.
 */
export async function listConsultationsController(
  input: unknown,
): Promise<TListConsultationsControllerOutput> {
  const parsed = await ListConsultationsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await listConsultationsUseCase(parsed.data));
}
