/**
 * deletePatientPhotoController — validates input and removes a specific Photo from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientPhotoUseCase } from "../../application/usecases/deletePatientPhoto.usecase";

export type TDeletePatientPhotoControllerOutput = void;

export async function deletePatientPhotoController(input: unknown): Promise<TDeletePatientPhotoControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientPhotoUseCase(parsed.data.patient_id, parsed.data.item_id);
}
