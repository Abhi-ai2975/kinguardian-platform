/**
 * DocumentReference GraphQL service stub.
 * Layer: server / core / document-reference / infrastructure
 * Not yet implemented — set FHIR_TRANSPORT=rest (the default).
 */
import { IDocumentReferenceService } from "../../domain/interfaces/document-reference.service.interface";
import {
  type TDocumentReferenceResponse,
  type TPaginatedDocumentReferenceResponse,
  type TCreateDocumentReference,
  type TUpdateDocumentReferenceDto,
  type TListDocumentReferencesQuery,
} from "@/modules/entities/schemas/document-reference";

export class DocumentReferenceGraphQLService implements IDocumentReferenceService {
  create(_dto: TCreateDocumentReference): Promise<TDocumentReferenceResponse> {
    throw new Error("DocumentReferenceGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  list(_query?: TListDocumentReferencesQuery): Promise<TPaginatedDocumentReferenceResponse> {
    throw new Error("DocumentReferenceGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  getById(_id: number): Promise<TDocumentReferenceResponse> {
    throw new Error("DocumentReferenceGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  update(_id: number, _dto: TUpdateDocumentReferenceDto): Promise<TDocumentReferenceResponse> {
    throw new Error("DocumentReferenceGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  delete(_id: number): Promise<void> {
    throw new Error("DocumentReferenceGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
}
