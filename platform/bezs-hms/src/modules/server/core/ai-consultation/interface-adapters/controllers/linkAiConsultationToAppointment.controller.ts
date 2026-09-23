/**
 * linkAiConsultationToAppointment controller.
 *
 * Layer: server / core / ai-consultation / interface-adapters / controllers
 */

import {
  LinkAiConsultationValidationSchema,
  type TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { linkAiConsultationToAppointmentUseCase } from "../../application/usecases/linkAiConsultationToAppointment.usecase";

function presenter(data: TAiConsultationResponse) {
  return data;
}

export type TLinkAiConsultationControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw link payload (id, fhir_appointment_id).
 * @returns Updated AiConsultation record with fhir_appointment_id set.
 * @throws InputParseError on validation failure.
 */
export async function linkAiConsultationToAppointmentController(
  input: unknown,
): Promise<TLinkAiConsultationControllerOutput> {
  const parsed = await LinkAiConsultationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await linkAiConsultationToAppointmentUseCase(parsed.data));
}
