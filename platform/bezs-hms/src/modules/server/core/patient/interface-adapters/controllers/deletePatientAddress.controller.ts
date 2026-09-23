/**
 * deletePatientAddressController — validates input and removes a specific Address from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientAddressUseCase } from "../../application/usecases/deletePatientAddress.usecase";

export type TDeletePatientAddressControllerOutput = void;

export async function deletePatientAddressController(input: unknown): Promise<TDeletePatientAddressControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientAddressUseCase(parsed.data.patient_id, parsed.data.item_id);
}
