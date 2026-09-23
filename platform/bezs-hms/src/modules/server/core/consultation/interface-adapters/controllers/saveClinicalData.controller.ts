/**
 * saveClinicalDataController — writes FHIR clinical resources to the consultation.
 *
 * Layer: server / core / consultation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  SaveClinicalDataValidationSchema,
  type TConsultationResponse,
} from "@/modules/entities/schemas/consultation";
import { saveClinicalDataUseCase } from "../../application/usecases/saveClinicalData.usecase";

function presenter(data: TConsultationResponse) {
  return data;
}

export type TSaveClinicalDataControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw payload ({ fhir_appointment_id, service_requests, ... }).
 * @returns The updated Consultation record.
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if no consultation exists for this appointment.
 */
export async function saveClinicalDataController(
  input: unknown,
): Promise<TSaveClinicalDataControllerOutput> {
  const parsed = await SaveClinicalDataValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await saveClinicalDataUseCase(parsed.data);
  return presenter(data);
}
