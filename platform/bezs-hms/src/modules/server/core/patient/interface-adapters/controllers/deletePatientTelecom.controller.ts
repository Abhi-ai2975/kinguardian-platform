/**
 * deletePatientTelecomController — validates input and removes a specific Telecom from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientTelecomUseCase } from "../../application/usecases/deletePatientTelecom.usecase";

export type TDeletePatientTelecomControllerOutput = void;

export async function deletePatientTelecomController(input: unknown): Promise<TDeletePatientTelecomControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientTelecomUseCase(parsed.data.patient_id, parsed.data.item_id);
}
