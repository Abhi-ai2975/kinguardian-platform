/**
 * Slot DI module.
 *
 * Layer: server / di / modules / slot
 *
 * Binds ISlotService to the REST or GraphQL implementation depending on the
 * FHIR_TRANSPORT environment variable. Defaults to "rest".
 *
 * Set FHIR_TRANSPORT=graphql to switch to SlotGraphQLService
 * (stub — not yet implemented).
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { SlotRestApiService } from "@/modules/server/core/slot/infrastructure/services/slot.rest.service";
import { SlotGraphQLService } from "@/modules/server/core/slot/infrastructure/services/slot.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers ISlotService in the IoC container.
 * Selects REST implementation unless FHIR_TRANSPORT=graphql.
 *
 * @param container - The application IoC container.
 */
export function registerSlotModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.ISlotService)
    .toClass(transport === "graphql" ? SlotGraphQLService : SlotRestApiService);
}
