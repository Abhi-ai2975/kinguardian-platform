/**
 * Patient DI module — binds IPatientsService to the correct transport implementation.
 *
 * Layer: dependency injection / modules
 * Resource: Patient (FHIR R4)
 *
 * Transport is selected at startup via the FHIR_TRANSPORT environment variable:
 *  - "rest"    (default) → PatientRestApiService  (fhir-gql REST API)
 *  - "graphql"           → PatientGraphQLService  (fhir-gql GraphQL API — stub)
 *
 * Use cases never reference a transport directly — they call
 * getInjection("IPatientsService") and receive whatever is bound here.
 * To switch transports, change FHIR_TRANSPORT and restart; no other file changes.
 */

import { Container } from "@evyweb/ioctopus";
import { PatientRestApiService } from "@/modules/server/core/patient/infrastructure/services/patient.rest.service";
import { PatientGraphQLService } from "@/modules/server/core/patient/infrastructure/services/patient.graphql.service";
import { DI_SYMBOLS } from "../../types";

/** Resolved once at module load — transport cannot change at runtime. */
const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers the Patient module into the DI container.
 * Binds IPatientsService to REST or GraphQL implementation based on FHIR_TRANSPORT.
 *
 * @param container - The ioctopus application container.
 */
export function registerPatientModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IPatientsService)
    .toClass(
      transport === "graphql"
        ? PatientGraphQLService
        : PatientRestApiService
    );
}
