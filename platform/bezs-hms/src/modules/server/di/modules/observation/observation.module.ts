/**
 * Observation DI module.
 *
 * Layer: server / di / modules / observation
 *
 * Binds IObservationService to the REST or GraphQL implementation depending on the
 * FHIR_TRANSPORT environment variable. Defaults to "rest".
 *
 * Set FHIR_TRANSPORT=graphql to switch to ObservationGraphQLService
 * (stub — not yet implemented).
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { ObservationRestApiService } from "@/modules/server/core/observation/infrastructure/services/observation.rest.service";
import { ObservationGraphQLService } from "@/modules/server/core/observation/infrastructure/services/observation.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers IObservationService in the IoC container.
 * Selects REST implementation unless FHIR_TRANSPORT=graphql.
 *
 * @param container - The application IoC container.
 */
export function registerObservationModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IObservationService)
    .toClass(transport === "graphql" ? ObservationGraphQLService : ObservationRestApiService);
}
