/**
 * getConsultationByFhirAppointmentIdController — lookup by FHIR appointment ID.
 *
 * Layer: server / core / consultation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetConsultationByFhirAppointmentIdValidationSchema,
  type TConsultationResponse,
} from "@/modules/entities/schemas/consultation";
import { getConsultationByFhirAppointmentIdUseCase } from "../../application/usecases/getConsultationByFhirAppointmentId.usecase";

function presenter(data: TConsultationResponse | null) {
  return data;
}

export type TGetConsultationByFhirAppointmentIdControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw payload ({ fhir_appointment_id }).
 * @returns Linked Consultation or null.
 * @throws InputParseError on schema validation failure.
 */
export async function getConsultationByFhirAppointmentIdController(
  input: unknown,
): Promise<TGetConsultationByFhirAppointmentIdControllerOutput> {
  const parsed =
    await GetConsultationByFhirAppointmentIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(
    await getConsultationByFhirAppointmentIdUseCase(parsed.data.fhir_appointment_id),
  );
}
