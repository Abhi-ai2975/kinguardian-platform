/**
 * Get DocumentReference by ID controller.
 * Layer: server / core / document-reference / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { GetByIdDocumentReferenceValidationSchema, type TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";
import { getDocumentReferenceByIdUseCase } from "../../application/usecases/getDocumentReferenceById.usecase";

function presenter(data: TDocumentReferenceResponse) { return data; }
export type TGetDocumentReferenceByIdControllerOutput = ReturnType<typeof presenter>;

export async function getDocumentReferenceByIdController(input: unknown): Promise<TGetDocumentReferenceByIdControllerOutput> {
  const parsed = await GetByIdDocumentReferenceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getDocumentReferenceByIdUseCase(parsed.data.id);
  return presenter(data);
}
