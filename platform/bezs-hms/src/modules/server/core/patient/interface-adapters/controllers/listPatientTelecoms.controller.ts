/**
 * listPatientTelecomsController — lists Telecom sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientTelecomsUseCase } from "../../application/usecases/listPatientTelecoms.usecase";

export type TListPatientTelecomsControllerOutput = Awaited<ReturnType<typeof listPatientTelecomsUseCase>>;

export async function listPatientTelecomsController(input: unknown): Promise<TListPatientTelecomsControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientTelecomsUseCase(parsed.data.patient_id);
}
