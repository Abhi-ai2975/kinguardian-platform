/**
 * ServiceRequest DI module.
 *
 * Layer: server / di / modules / service-request
 *
 * Binds IServiceRequestService to the REST or GraphQL implementation depending on the
 * FHIR_TRANSPORT environment variable. Defaults to "rest".
 *
 * Set FHIR_TRANSPORT=graphql to switch to ServiceRequestGraphQLService
 * (stub — not yet implemented).
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { ServiceRequestRestApiService } from "@/modules/server/core/service-request/infrastructure/services/service-request.rest.service";
import { ServiceRequestGraphQLService } from "@/modules/server/core/service-request/infrastructure/services/service-request.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers IServiceRequestService in the IoC container.
 * Selects REST implementation unless FHIR_TRANSPORT=graphql.
 *
 * @param container - The application IoC container.
 */
export function registerServiceRequestModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IServiceRequestService)
    .toClass(transport === "graphql" ? ServiceRequestGraphQLService : ServiceRequestRestApiService);
}
