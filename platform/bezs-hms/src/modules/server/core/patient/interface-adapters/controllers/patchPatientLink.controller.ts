/**
 * patchPatientLinkController — validates input and updates a specific Link on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientLinkValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientLinkUseCase } from "../../application/usecases/patchPatientLink.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TPatchPatientLinkControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientLinkController(input: unknown): Promise<TPatchPatientLinkControllerOutput> {
  const parsed = await PatchPatientLinkValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(await patchPatientLinkUseCase(patient_id, item_id, dto as any));
}
