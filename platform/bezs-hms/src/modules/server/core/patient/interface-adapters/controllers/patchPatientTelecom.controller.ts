/**
 * patchPatientTelecomController — validates input and updates a specific Telecom on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientTelecomValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientTelecomUseCase } from "../../application/usecases/patchPatientTelecom.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TPatchPatientTelecomControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientTelecomController(input: unknown): Promise<TPatchPatientTelecomControllerOutput> {
  const parsed = await PatchPatientTelecomValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(await patchPatientTelecomUseCase(patient_id, item_id, dto as any));
}
