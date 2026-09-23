/**
 * deletePatientContactController — validates input and removes a specific Contact from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientContactUseCase } from "../../application/usecases/deletePatientContact.usecase";

export type TDeletePatientContactControllerOutput = void;

export async function deletePatientContactController(input: unknown): Promise<TDeletePatientContactControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientContactUseCase(parsed.data.patient_id, parsed.data.item_id);
}
