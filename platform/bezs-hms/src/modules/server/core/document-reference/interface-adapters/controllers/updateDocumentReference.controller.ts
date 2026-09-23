/**
 * Update DocumentReference controller.
 * Layer: server / core / document-reference / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { UpdateDocumentReferenceValidationSchema, type TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";
import { updateDocumentReferenceUseCase } from "../../application/usecases/updateDocumentReference.usecase";

function presenter(data: TDocumentReferenceResponse) { return data; }
export type TUpdateDocumentReferenceControllerOutput = ReturnType<typeof presenter>;

export async function updateDocumentReferenceController(input: unknown): Promise<TUpdateDocumentReferenceControllerOutput> {
  const parsed = await UpdateDocumentReferenceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateDocumentReferenceUseCase(id, dto);
  return presenter(data);
}
