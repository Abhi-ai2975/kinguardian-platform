/**
 * listPatientIdentifiersController — lists Identifier sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientIdentifiersUseCase } from "../../application/usecases/listPatientIdentifiers.usecase";

export type TListPatientIdentifiersControllerOutput = Awaited<ReturnType<typeof listPatientIdentifiersUseCase>>;

export async function listPatientIdentifiersController(input: unknown): Promise<TListPatientIdentifiersControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientIdentifiersUseCase(parsed.data.patient_id);
}
