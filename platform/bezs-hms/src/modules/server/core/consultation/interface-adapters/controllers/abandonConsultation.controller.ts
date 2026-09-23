/**
 * abandonConsultationController — marks a consultation as ABANDONED.
 *
 * Layer: server / core / consultation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  AbandonConsultationValidationSchema,
  type TConsultationResponse,
} from "@/modules/entities/schemas/consultation";
import { abandonConsultationUseCase } from "../../application/usecases/abandonConsultation.usecase";

function presenter(data: TConsultationResponse) {
  return data;
}

export type TAbandonConsultationControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw payload ({ fhir_appointment_id }).
 * @returns The updated Consultation record with status ABANDONED.
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if no consultation exists for this appointment.
 */
export async function abandonConsultationController(
  input: unknown,
): Promise<TAbandonConsultationControllerOutput> {
  const parsed = await AbandonConsultationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await abandonConsultationUseCase(parsed.data);
  return presenter(data);
}
