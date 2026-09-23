/**
 * patchPatientGeneralPractitionerController — validates input and updates a specific GeneralPractitioner on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientGPValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientGeneralPractitionerUseCase } from "../../application/usecases/patchPatientGeneralPractitioner.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TPatchPatientGeneralPractitionerControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientGeneralPractitionerController(input: unknown): Promise<TPatchPatientGeneralPractitionerControllerOutput> {
  const parsed = await PatchPatientGPValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(await patchPatientGeneralPractitionerUseCase(patient_id, item_id, dto as any));
}
