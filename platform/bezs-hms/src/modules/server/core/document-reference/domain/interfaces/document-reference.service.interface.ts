/**
 * DocumentReference service interface.
 * Layer: server / core / document-reference / domain
 * Defines the contract that infrastructure implementations must satisfy.
 */
import type {
  TCreateDocumentReference,
  TUpdateDocumentReferenceDto,
  TListDocumentReferencesQuery,
  TDocumentReferenceResponse,
  TPaginatedDocumentReferenceResponse,
} from "@/modules/entities/schemas/document-reference";

export interface IDocumentReferenceService {
  create(dto: TCreateDocumentReference): Promise<TDocumentReferenceResponse>;
  list(query?: TListDocumentReferencesQuery): Promise<TPaginatedDocumentReferenceResponse>;
  getById(id: number): Promise<TDocumentReferenceResponse>;
  update(id: number, dto: TUpdateDocumentReferenceDto): Promise<TDocumentReferenceResponse>;
  delete(id: number): Promise<void>;
}
