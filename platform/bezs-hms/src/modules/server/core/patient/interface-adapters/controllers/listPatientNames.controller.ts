/**
 * listPatientNamesController — lists Name sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientNamesUseCase } from "../../application/usecases/listPatientNames.usecase";

export type TListPatientNamesControllerOutput = Awaited<ReturnType<typeof listPatientNamesUseCase>>;

export async function listPatientNamesController(input: unknown): Promise<TListPatientNamesControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientNamesUseCase(parsed.data.patient_id);
}
