/**
 * Location DI module — binds ILocationsService to the correct transport implementation.
 *
 * Layer: dependency injection / modules
 * Resource: Location
 *
 * Transport is selected at startup via the FHIR_TRANSPORT environment variable:
 *  - "rest"    (default) → LocationRestApiService  (fhir-gql REST API)
 *  - "graphql"           → LocationGraphQLService  (fhir-gql GraphQL API)
 *
 * Use cases never reference a transport directly — they call
 * getInjection("ILocationsService") and receive whatever is bound here.
 * To switch transports, change FHIR_TRANSPORT and restart; no other file changes.
 */

import { Container } from "@evyweb/ioctopus";
import { LocationRestApiService } from "@/modules/server/core/location/infrastructure/services/location.rest.service";
import { LocationGraphQLService } from "@/modules/server/core/location/infrastructure/services/location.graphql.service";
import { DI_SYMBOLS } from "../../types";

/** Resolved once at module load — transport cannot change at runtime. */
const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers the Location module into the DI container.
 * Binds ILocationsService to REST or GraphQL implementation based on FHIR_TRANSPORT.
 *
 * @param container - The ioctopus application container.
 */
export function registerLocationModule(container: Container) {
  container
    .bind(DI_SYMBOLS.ILocationsService)
    .toClass(
      transport === "graphql"
        ? LocationGraphQLService
        : LocationRestApiService
    );
}
