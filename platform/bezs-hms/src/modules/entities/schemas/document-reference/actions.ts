/**
 * DocumentReference ZSA server action input schemas.
 * Layer: entities / schemas / document-reference
 * Mutating actions (create/update/delete) include transportOptions for
 * revalidation/redirect after the action completes.
 */
import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateDocumentReferenceValidationSchema,
  UpdateDocumentReferenceValidationSchema,
  ListDocumentReferencesValidationSchema,
  GetByIdDocumentReferenceValidationSchema,
  DeleteDocumentReferenceValidationSchema,
} from "./input";

export const CreateDocumentReferenceActionSchema = z.object({
  payload: CreateDocumentReferenceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateDocumentReferenceAction = z.infer<typeof CreateDocumentReferenceActionSchema>;

export const ListDocumentReferencesActionSchema = z.object({
  payload: ListDocumentReferencesValidationSchema.optional(),
});
export type TListDocumentReferencesAction = z.infer<typeof ListDocumentReferencesActionSchema>;

export const GetDocumentReferenceByIdActionSchema = z.object({
  payload: GetByIdDocumentReferenceValidationSchema,
});
export type TGetDocumentReferenceByIdAction = z.infer<typeof GetDocumentReferenceByIdActionSchema>;

export const UpdateDocumentReferenceActionSchema = z.object({
  payload: UpdateDocumentReferenceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateDocumentReferenceAction = z.infer<typeof UpdateDocumentReferenceActionSchema>;

export const DeleteDocumentReferenceActionSchema = z.object({
  payload: DeleteDocumentReferenceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteDocumentReferenceAction = z.infer<typeof DeleteDocumentReferenceActionSchema>;
