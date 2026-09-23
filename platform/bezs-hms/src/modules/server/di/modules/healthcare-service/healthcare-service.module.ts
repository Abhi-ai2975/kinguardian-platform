/**
 * HealthcareService DI module — binds IHealthcareServicesService to the correct transport implementation.
 *
 * Layer: dependency injection / modules
 * Resource: HealthcareService
 *
 * Transport is selected at startup via the FHIR_TRANSPORT environment variable:
 *  - "rest"    (default) → HealthcareServiceRestApiService  (fhir-gql REST API)
 *  - "graphql"           → HealthcareServiceGraphQLService  (fhir-gql GraphQL API)
 *
 * Use cases never reference a transport directly — they call
 * getInjection("IHealthcareServicesService") and receive whatever is bound here.
 * To switch transports, change FHIR_TRANSPORT and restart; no other file changes.
 */

import { Container } from "@evyweb/ioctopus";
import { HealthcareServiceRestApiService } from "@/modules/server/core/healthcare-service/infrastructure/services/healthcare-service.rest.service";
import { HealthcareServiceGraphQLService } from "@/modules/server/core/healthcare-service/infrastructure/services/healthcare-service.graphql.service";
import { DI_SYMBOLS } from "../../types";

/** Resolved once at module load — transport cannot change at runtime. */
const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers the HealthcareService module into the DI container.
 * Binds IHealthcareServicesService to REST or GraphQL implementation based on FHIR_TRANSPORT.
 *
 * @param container - The ioctopus application container.
 */
export function registerHealthcareServiceModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IHealthcareServicesService)
    .toClass(
      transport === "graphql"
        ? HealthcareServiceGraphQLService
        : HealthcareServiceRestApiService
    );
}
