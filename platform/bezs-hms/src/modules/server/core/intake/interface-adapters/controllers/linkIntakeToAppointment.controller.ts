/**
 * linkIntakeToAppointment controller.
 *
 * Layer: server / core / intake / interface-adapters / controllers
 */

import { LinkIntakeValidationSchema, type TIntakeResponse } from "@/modules/entities/schemas/intake";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { linkIntakeToAppointmentUseCase } from "../../application/usecases/linkIntakeToAppointment.usecase";

function presenter(data: TIntakeResponse) {
  return data;
}

export type TLinkIntakeControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw link payload (id, fhir_appointment_id).
 * @returns Updated Intake record with fhir_appointment_id set.
 */
export async function linkIntakeToAppointmentController(
  input: unknown,
): Promise<TLinkIntakeControllerOutput> {
  const parsed = await LinkIntakeValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await linkIntakeToAppointmentUseCase(parsed.data));
}
