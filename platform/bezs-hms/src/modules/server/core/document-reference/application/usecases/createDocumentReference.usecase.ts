/**
 * Create DocumentReference use case.
 * Layer: server / core / document-reference / application
 */
import { getInjection } from "@/modules/server/di/container";
import { type TCreateDocumentReference, type TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";

export async function createDocumentReferenceUseCase(dto: TCreateDocumentReference): Promise<TDocumentReferenceResponse> {
  const service = getInjection("IDocumentReferenceService");
  return service.create(dto);
}
