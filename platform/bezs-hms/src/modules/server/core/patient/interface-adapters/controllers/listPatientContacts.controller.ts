/**
 * listPatientContactsController — lists Contact sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientContactsUseCase } from "../../application/usecases/listPatientContacts.usecase";

export type TListPatientContactsControllerOutput = Awaited<ReturnType<typeof listPatientContactsUseCase>>;

export async function listPatientContactsController(input: unknown): Promise<TListPatientContactsControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientContactsUseCase(parsed.data.patient_id);
}
