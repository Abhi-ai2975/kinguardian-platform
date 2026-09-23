/**
 * Practitioner DI module.
 *
 * Layer: server / di / modules / practitioner
 *
 * Binds IPractitionersService to the REST or GraphQL implementation depending
 * on the FHIR_TRANSPORT environment variable. Defaults to "rest".
 *
 * Set FHIR_TRANSPORT=graphql to switch to PractitionerGraphQLService
 * (stub — not yet implemented).
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { PractitionerRestApiService } from "@/modules/server/core/practitioner/infrastructure/services/practitioner.rest.service";
import { PractitionerGraphQLService } from "@/modules/server/core/practitioner/infrastructure/services/practitioner.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers IPractitionersService in the IoC container.
 * Selects REST implementation unless FHIR_TRANSPORT=graphql.
 *
 * @param container - The application IoC container.
 */
export function registerPractitionerModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IPractitionersService)
    .toClass(transport === "graphql" ? PractitionerGraphQLService : PractitionerRestApiService);
}
