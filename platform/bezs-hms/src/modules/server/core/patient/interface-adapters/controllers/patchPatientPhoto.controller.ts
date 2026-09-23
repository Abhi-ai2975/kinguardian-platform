/**
 * patchPatientPhotoController — validates input and updates a specific Photo on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientPhotoValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientPhotoUseCase } from "../../application/usecases/patchPatientPhoto.usecase";

function presenter(data: TPatientResponse) {
  return data;
}
export type TPatchPatientPhotoControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientPhotoController(
  input: unknown,
): Promise<TPatchPatientPhotoControllerOutput> {
  const parsed = await PatchPatientPhotoValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(
    await patchPatientPhotoUseCase(patient_id, item_id, dto as any),
  );
}
