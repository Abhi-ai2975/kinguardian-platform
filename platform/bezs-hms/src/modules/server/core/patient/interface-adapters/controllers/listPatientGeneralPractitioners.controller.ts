/**
 * listPatientGeneralPractitionersController — lists GeneralPractitioner sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientGeneralPractitionersUseCase } from "../../application/usecases/listPatientGeneralPractitioners.usecase";

export type TListPatientGeneralPractitionersControllerOutput = Awaited<ReturnType<typeof listPatientGeneralPractitionersUseCase>>;

export async function listPatientGeneralPractitionersController(input: unknown): Promise<TListPatientGeneralPractitionersControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientGeneralPractitionersUseCase(parsed.data.patient_id);
}
