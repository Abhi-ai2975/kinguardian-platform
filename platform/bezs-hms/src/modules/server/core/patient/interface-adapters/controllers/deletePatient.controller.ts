/**
 * deletePatientController — permanently deletes a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientUseCase } from "../../application/usecases/deletePatient.usecase";

export type TDeletePatientControllerOutput = void;

export async function deletePatientController(input: unknown): Promise<TDeletePatientControllerOutput> {
  const parsed = await DeletePatientValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientUseCase(parsed.data.id);
}
