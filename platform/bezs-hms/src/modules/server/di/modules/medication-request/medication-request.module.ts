/**
 * MedicationRequest DI module.
 *
 * Layer: server / di / modules / medication-request
 *
 * Binds IMedicationRequestService to the REST or GraphQL implementation depending on the
 * FHIR_TRANSPORT environment variable. Defaults to "rest".
 *
 * Set FHIR_TRANSPORT=graphql to switch to MedicationRequestGraphQLService
 * (stub — not yet implemented).
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { MedicationRequestRestApiService } from "@/modules/server/core/medication-request/infrastructure/services/medication-request.rest.service";
import { MedicationRequestGraphQLService } from "@/modules/server/core/medication-request/infrastructure/services/medication-request.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers IMedicationRequestService in the IoC container.
 * Selects REST implementation unless FHIR_TRANSPORT=graphql.
 *
 * @param container - The application IoC container.
 */
export function registerMedicationRequestModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IMedicationRequestService)
    .toClass(transport === "graphql" ? MedicationRequestGraphQLService : MedicationRequestRestApiService);
}
