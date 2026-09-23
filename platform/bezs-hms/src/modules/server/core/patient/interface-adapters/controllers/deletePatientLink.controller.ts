/**
 * deletePatientLinkController — validates input and removes a specific Link from a Patient.
 * Layer: interface-adapters / controllers
 */
import { DeletePatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePatientLinkUseCase } from "../../application/usecases/deletePatientLink.usecase";

export type TDeletePatientLinkControllerOutput = void;

export async function deletePatientLinkController(input: unknown): Promise<TDeletePatientLinkControllerOutput> {
  const parsed = await DeletePatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePatientLinkUseCase(parsed.data.patient_id, parsed.data.item_id);
}
