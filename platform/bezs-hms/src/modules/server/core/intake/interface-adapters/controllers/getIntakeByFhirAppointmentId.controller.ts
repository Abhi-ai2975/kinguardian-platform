/**
 * getIntakeByFhirAppointmentId controller.
 *
 * Layer: server / core / intake / interface-adapters / controllers
 *
 * Doctor-side: retrieves the intake session linked to a FHIR appointment.
 */

import {
  GetIntakeByFhirAppointmentIdValidationSchema,
  type TIntakeResponse,
} from "@/modules/entities/schemas/intake";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getIntakeByFhirAppointmentIdUseCase } from "../../application/usecases/getIntakeByFhirAppointmentId.usecase";

function presenter(data: TIntakeResponse | null) {
  return data;
}

export type TGetIntakeByFhirAppointmentIdControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw payload ({ fhir_appointment_id }).
 * @returns Linked Intake or null.
 */
export async function getIntakeByFhirAppointmentIdController(
  input: unknown,
): Promise<TGetIntakeByFhirAppointmentIdControllerOutput> {
  const parsed = await GetIntakeByFhirAppointmentIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await getIntakeByFhirAppointmentIdUseCase(parsed.data.fhir_appointment_id));
}
