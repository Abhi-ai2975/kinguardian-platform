/**
 * List DocumentReferences use case.
 * Layer: server / core / document-reference / application
 */
import { getInjection } from "@/modules/server/di/container";
import { type TListDocumentReferencesQuery, type TPaginatedDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";

export async function listDocumentReferencesUseCase(query?: TListDocumentReferencesQuery): Promise<TPaginatedDocumentReferenceResponse> {
  const service = getInjection("IDocumentReferenceService");
  return service.list(query);
}
