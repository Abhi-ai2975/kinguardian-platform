/**
 * DocumentReference DI module.
 * Layer: server / di / modules / document-reference
 * Binds IDocumentReferenceService to the REST implementation (default) or
 * GraphQL stub when FHIR_TRANSPORT=graphql.
 */
import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { DocumentReferenceRestApiService } from "@/modules/server/core/document-reference/infrastructure/services/document-reference.rest.service";
import { DocumentReferenceGraphQLService } from "@/modules/server/core/document-reference/infrastructure/services/document-reference.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerDocumentReferenceModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IDocumentReferenceService)
    .toClass(transport === "graphql" ? DocumentReferenceGraphQLService : DocumentReferenceRestApiService);
}
