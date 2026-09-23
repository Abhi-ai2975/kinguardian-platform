/**
 * deletePatientCommunicationController — validates input and removes a specific Communication from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientCommunicationUseCase } from "../../application/usecases/deletePatientCommunication.usecase";

export type TDeletePatientCommunicationControllerOutput = void;

export async function deletePatientCommunicationController(input: unknown): Promise<TDeletePatientCommunicationControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientCommunicationUseCase(parsed.data.patient_id, parsed.data.item_id);
}
