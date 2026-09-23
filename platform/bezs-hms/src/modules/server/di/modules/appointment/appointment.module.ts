/**
 * Appointment DI module.
 *
 * Layer: server / di / modules / appointment
 *
 * Registers the IAppointmentService binding in the ioctopus IoC container.
 * Selects REST (default) or GraphQL stub based on the FHIR_TRANSPORT env var.
 *
 * Call registerAppointmentModule(container) in container.ts.
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { AppointmentRestApiService } from "@/modules/server/core/appointment/infrastructure/services/appointment.rest.service";
import { AppointmentGraphqlService } from "@/modules/server/core/appointment/infrastructure/services/appointment.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers IAppointmentService in the IoC container.
 * Selects REST implementation unless FHIR_TRANSPORT=graphql.
 *
 * @param container - The application IoC container.
 */
export function registerAppointmentModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IAppointmentService)
    .toClass(
      transport === "graphql" ? AppointmentGraphqlService : AppointmentRestApiService,
    );
}
