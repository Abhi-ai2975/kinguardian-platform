/**
 * Create DocumentReference controller.
 * Layer: server / core / document-reference / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { CreateDocumentReferenceValidationSchema, type TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";
import { createDocumentReferenceUseCase } from "../../application/usecases/createDocumentReference.usecase";

function presenter(data: TDocumentReferenceResponse) { return data; }
export type TCreateDocumentReferenceControllerOutput = ReturnType<typeof presenter>;

export async function createDocumentReferenceController(input: unknown): Promise<TCreateDocumentReferenceControllerOutput> {
  const parsed = await CreateDocumentReferenceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createDocumentReferenceUseCase(parsed.data);
  return presenter(data);
}
