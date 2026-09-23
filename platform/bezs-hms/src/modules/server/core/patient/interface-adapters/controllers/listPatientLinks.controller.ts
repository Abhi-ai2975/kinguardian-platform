/**
 * listPatientLinksController — lists Link sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientLinksUseCase } from "../../application/usecases/listPatientLinks.usecase";

export type TListPatientLinksControllerOutput = Awaited<ReturnType<typeof listPatientLinksUseCase>>;

export async function listPatientLinksController(input: unknown): Promise<TListPatientLinksControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientLinksUseCase(parsed.data.patient_id);
}
