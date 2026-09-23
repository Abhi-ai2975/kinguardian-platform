/**
 * Get DocumentReference by ID use case.
 * Layer: server / core / document-reference / application
 */
import { getInjection } from "@/modules/server/di/container";
import { type TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";

export async function getDocumentReferenceByIdUseCase(id: number): Promise<TDocumentReferenceResponse> {
  const service = getInjection("IDocumentReferenceService");
  return service.getById(id);
}
