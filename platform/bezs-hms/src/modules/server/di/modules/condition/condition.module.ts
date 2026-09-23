/**
 * Condition DI module.
 *
 * Layer: server / di / modules / condition
 *
 * Binds IConditionService to the REST or GraphQL implementation depending on the
 * FHIR_TRANSPORT environment variable. Defaults to "rest".
 *
 * Set FHIR_TRANSPORT=graphql to switch to ConditionGraphQLService
 * (stub — not yet implemented).
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { ConditionRestApiService } from "@/modules/server/core/condition/infrastructure/services/condition.rest.service";
import { ConditionGraphQLService } from "@/modules/server/core/condition/infrastructure/services/condition.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers IConditionService in the IoC container.
 * Selects REST implementation unless FHIR_TRANSPORT=graphql.
 *
 * @param container - The application IoC container.
 */
export function registerConditionModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IConditionService)
    .toClass(transport === "graphql" ? ConditionGraphQLService : ConditionRestApiService);
}
