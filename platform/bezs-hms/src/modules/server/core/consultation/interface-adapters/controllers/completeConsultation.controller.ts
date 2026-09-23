/**
 * completeConsultationController — writes reports and marks consultation COMPLETED.
 *
 * Layer: server / core / consultation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CompleteConsultationValidationSchema,
  type TConsultationResponse,
} from "@/modules/entities/schemas/consultation";
import { completeConsultationUseCase } from "../../application/usecases/completeConsultation.usecase";

function presenter(data: TConsultationResponse) {
  return data;
}

export type TCompleteConsultationControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw payload ({ fhir_appointment_id, virtual_conversation, soap_note, full_report }).
 * @returns The updated Consultation record.
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if no consultation exists for this appointment.
 */
export async function completeConsultationController(
  input: unknown,
): Promise<TCompleteConsultationControllerOutput> {
  const parsed = await CompleteConsultationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await completeConsultationUseCase(parsed.data);
  return presenter(data);
}
