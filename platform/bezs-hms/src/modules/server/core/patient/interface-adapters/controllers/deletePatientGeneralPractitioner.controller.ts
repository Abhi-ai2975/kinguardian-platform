/**
 * deletePatientGeneralPractitionerController — validates input and removes a specific GeneralPractitioner from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientGeneralPractitionerUseCase } from "../../application/usecases/deletePatientGeneralPractitioner.usecase";

export type TDeletePatientGeneralPractitionerControllerOutput = void;

export async function deletePatientGeneralPractitionerController(input: unknown): Promise<TDeletePatientGeneralPractitionerControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientGeneralPractitionerUseCase(parsed.data.patient_id, parsed.data.item_id);
}
