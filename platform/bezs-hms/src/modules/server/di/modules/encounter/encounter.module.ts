/**
 * Encounter DI module.
 *
 * Layer: server / di / modules / encounter
 *
 * Binds IEncounterService to the REST or GraphQL implementation depending on the
 * FHIR_TRANSPORT environment variable. Defaults to "rest".
 *
 * Set FHIR_TRANSPORT=graphql to switch to EncounterGraphQLService
 * (stub — not yet implemented).
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { EncounterRestApiService } from "@/modules/server/core/encounter/infrastructure/services/encounter.rest.service";
import { EncounterGraphQLService } from "@/modules/server/core/encounter/infrastructure/services/encounter.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers IEncounterService in the IoC container.
 * Selects REST implementation unless FHIR_TRANSPORT=graphql.
 *
 * @param container - The application IoC container.
 */
export function registerEncounterModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IEncounterService)
    .toClass(transport === "graphql" ? EncounterGraphQLService : EncounterRestApiService);
}
