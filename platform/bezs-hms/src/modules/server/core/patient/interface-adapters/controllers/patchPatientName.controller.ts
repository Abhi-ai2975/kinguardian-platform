/**
 * patchPatientNameController — validates input and updates a specific Name on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientNameValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientNameUseCase } from "../../application/usecases/patchPatientName.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TPatchPatientNameControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientNameController(input: unknown): Promise<TPatchPatientNameControllerOutput> {
  const parsed = await PatchPatientNameValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(await patchPatientNameUseCase(patient_id, item_id, dto as any));
}
