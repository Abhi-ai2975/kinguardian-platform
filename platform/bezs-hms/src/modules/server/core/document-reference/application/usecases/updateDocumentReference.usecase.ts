/**
 * Update DocumentReference use case.
 * Layer: server / core / document-reference / application
 */
import { getInjection } from "@/modules/server/di/container";
import { type TUpdateDocumentReferenceDto, type TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";

export async function updateDocumentReferenceUseCase(id: number, dto: TUpdateDocumentReferenceDto): Promise<TDocumentReferenceResponse> {
  const service = getInjection("IDocumentReferenceService");
  return service.update(id, dto);
}
