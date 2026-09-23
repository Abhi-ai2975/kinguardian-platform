/**
 * patchPatientCommunicationController — validates input and updates a specific Communication on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientCommunicationValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientCommunicationUseCase } from "../../application/usecases/patchPatientCommunication.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TPatchPatientCommunicationControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientCommunicationController(input: unknown): Promise<TPatchPatientCommunicationControllerOutput> {
  const parsed = await PatchPatientCommunicationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(await patchPatientCommunicationUseCase(patient_id, item_id, dto as any));
}
