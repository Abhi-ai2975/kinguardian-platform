/**
 * Organization DI module — binds IOrganizationsService to the correct transport implementation.
 *
 * Layer: dependency injection / modules
 * Resource: Organization
 *
 * Transport is selected at startup via the FHIR_TRANSPORT environment variable:
 *  - "rest"    (default) → OrganizationRestApiService  (fhir-gql REST API)
 *  - "graphql"           → OrganizationGraphQLService  (fhir-gql GraphQL API)
 *
 * Use cases never reference a transport directly — they call
 * getInjection("IOrganizationsService") and receive whatever is bound here.
 * To switch transports, change FHIR_TRANSPORT and restart; no other file changes.
 */

import { Container } from "@evyweb/ioctopus";
import { OrganizationRestApiService } from "@/modules/server/core/organization/infrastructure/services/organization.rest.service";
import { OrganizationGraphQLService } from "@/modules/server/core/organization/infrastructure/services/organization.graphql.service";
import { DI_SYMBOLS } from "../../types";

/** Resolved once at module load — transport cannot change at runtime. */
const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers the Organization module into the DI container.
 * Binds IOrganizationsService to REST or GraphQL implementation based on FHIR_TRANSPORT.
 *
 * @param container - The ioctopus application container.
 */
export function registerOrganizationModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IOrganizationsService)
    .toClass(
      transport === "graphql"
        ? OrganizationGraphQLService
        : OrganizationRestApiService
    );
}
