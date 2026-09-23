/**
 * patchPatientContactController — validates input and updates a specific Contact on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientContactValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientContactUseCase } from "../../application/usecases/patchPatientContact.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TPatchPatientContactControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientContactController(input: unknown): Promise<TPatchPatientContactControllerOutput> {
  const parsed = await PatchPatientContactValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(await patchPatientContactUseCase(patient_id, item_id, dto as any));
}
