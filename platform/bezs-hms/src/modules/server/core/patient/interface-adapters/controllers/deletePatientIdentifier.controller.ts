/**
 * deletePatientIdentifierController — validates input and removes a specific Identifier from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientIdentifierUseCase } from "../../application/usecases/deletePatientIdentifier.usecase";

export type TDeletePatientIdentifierControllerOutput = void;

export async function deletePatientIdentifierController(input: unknown): Promise<TDeletePatientIdentifierControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientIdentifierUseCase(parsed.data.patient_id, parsed.data.item_id);
}
