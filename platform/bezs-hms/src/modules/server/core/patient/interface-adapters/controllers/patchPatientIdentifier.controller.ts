/**
 * patchPatientIdentifierController — validates input and updates a specific Identifier on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientIdentifierValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientIdentifierUseCase } from "../../application/usecases/patchPatientIdentifier.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TPatchPatientIdentifierControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientIdentifierController(input: unknown): Promise<TPatchPatientIdentifierControllerOutput> {
  const parsed = await PatchPatientIdentifierValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(await patchPatientIdentifierUseCase(patient_id, item_id, dto as any));
}
