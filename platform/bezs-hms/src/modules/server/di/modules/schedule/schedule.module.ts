/**
 * Schedule DI module — binds ISchedulesService to the correct transport implementation.
 *
 * Layer: dependency injection / modules
 * Resource: Schedule
 *
 * Transport is selected at startup via the FHIR_TRANSPORT environment variable:
 *  - "rest"    (default) → ScheduleRestApiService  (fhir-gql REST API)
 *  - "graphql"           → ScheduleGraphQLService   (fhir-gql GraphQL API, not yet implemented)
 *
 * Use cases never reference a transport directly — they call
 * getInjection("ISchedulesService") and receive whatever is bound here.
 * To switch transports, change FHIR_TRANSPORT and restart; no other file changes.
 */

import { Container } from "@evyweb/ioctopus";
import { ScheduleRestApiService } from "@/modules/server/core/schedule/infrastructure/services/schedule.rest.service";
import { ScheduleGraphQLService } from "@/modules/server/core/schedule/infrastructure/services/schedule.graphql.service";
import { DI_SYMBOLS } from "../../types";

/** Resolved once at module load — transport cannot change at runtime. */
const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers the Schedule module into the DI container.
 * Binds ISchedulesService to REST or GraphQL implementation based on FHIR_TRANSPORT.
 *
 * @param container - The ioctopus application container.
 */
export function registerScheduleModule(container: Container) {
  container
    .bind(DI_SYMBOLS.ISchedulesService)
    .toClass(transport === "graphql" ? ScheduleGraphQLService : ScheduleRestApiService);
}
