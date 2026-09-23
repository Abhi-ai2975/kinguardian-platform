/**
 * Delete DocumentReference use case.
 * Layer: server / core / document-reference / application
 */
import { getInjection } from "@/modules/server/di/container";

export async function deleteDocumentReferenceUseCase(id: number): Promise<void> {
  const service = getInjection("IDocumentReferenceService");
  return service.delete(id);
}
