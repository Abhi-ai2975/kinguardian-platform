/**
 * Delete DocumentReference controller.
 * Layer: server / core / document-reference / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteDocumentReferenceValidationSchema } from "@/modules/entities/schemas/document-reference";
import { deleteDocumentReferenceUseCase } from "../../application/usecases/deleteDocumentReference.usecase";

export async function deleteDocumentReferenceController(input: unknown): Promise<void> {
  const parsed = await DeleteDocumentReferenceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteDocumentReferenceUseCase(parsed.data.id);
}
