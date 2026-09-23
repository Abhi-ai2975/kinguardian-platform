/**
 * List DocumentReferences controller.
 * Layer: server / core / document-reference / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { ListDocumentReferencesValidationSchema, type TPaginatedDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";
import { listDocumentReferencesUseCase } from "../../application/usecases/listDocumentReferences.usecase";

function presenter(data: TPaginatedDocumentReferenceResponse) { return data; }
export type TListDocumentReferencesControllerOutput = ReturnType<typeof presenter>;

export async function listDocumentReferencesController(input: unknown): Promise<TListDocumentReferencesControllerOutput> {
  const parsed = await ListDocumentReferencesValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listDocumentReferencesUseCase(parsed.data);
  return presenter(data);
}
