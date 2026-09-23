/**
 * addPatientPhotoController — validates input and adds a Photo to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientPhotoValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientPhotoUseCase } from "../../application/usecases/addPatientPhoto.usecase";

function presenter(data: TPatientResponse) {
  return data;
}
export type TAddPatientPhotoControllerOutput = ReturnType<typeof presenter>;

export async function addPatientPhotoController(
  input: unknown,
): Promise<TAddPatientPhotoControllerOutput> {
  const parsed = await AddPatientPhotoValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientPhotoUseCase(patient_id, dto as any));
}
