/**
 * listPatientCommunicationsController — lists Communication sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientCommunicationsUseCase } from "../../application/usecases/listPatientCommunications.usecase";

export type TListPatientCommunicationsControllerOutput = Awaited<ReturnType<typeof listPatientCommunicationsUseCase>>;

export async function listPatientCommunicationsController(input: unknown): Promise<TListPatientCommunicationsControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientCommunicationsUseCase(parsed.data.patient_id);
}
