/**
 * Terminology DI module — binds ITerminologyService to REST or GraphQL implementation.
 *
 * Layer: server / di / modules / terminology
 *
 * Switch via FHIR_TRANSPORT env var:
 *   "rest"    (default) → TerminologyRestApiService
 *   "graphql"           → TerminologyGraphQLService (stub — throws on every call)
 *
 * Resolved once at application startup. Use cases call getInjection("ITerminologyService")
 * and are fully transport-agnostic.
 */

import { Container } from "@evyweb/ioctopus";

import { DI_SYMBOLS } from "../../types";
import { TerminologyRestApiService } from "@/modules/server/core/terminology/infrastructure/services/terminology.rest.service";
import { TerminologyGraphQLService } from "@/modules/server/core/terminology/infrastructure/services/terminology.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers the ITerminologyService binding in the DI container.
 * @param container - The ioctopus application container.
 */
export function registerTerminologyModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.ITerminologyService)
    .toClass(
      transport === "graphql"
        ? TerminologyGraphQLService
        : TerminologyRestApiService,
    );
}
