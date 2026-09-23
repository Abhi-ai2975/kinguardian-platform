/**
 * deletePatientNameController — validates input and removes a specific Name from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientNameUseCase } from "../../application/usecases/deletePatientName.usecase";

export type TDeletePatientNameControllerOutput = void;

export async function deletePatientNameController(input: unknown): Promise<TDeletePatientNameControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientNameUseCase(parsed.data.patient_id, parsed.data.item_id);
}
