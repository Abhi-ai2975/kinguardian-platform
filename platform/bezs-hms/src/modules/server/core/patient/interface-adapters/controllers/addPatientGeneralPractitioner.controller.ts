/**
 * addPatientGeneralPractitionerController — validates input and adds a GeneralPractitioner to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientGPValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientGeneralPractitionerUseCase } from "../../application/usecases/addPatientGeneralPractitioner.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TAddPatientGeneralPractitionerControllerOutput = ReturnType<typeof presenter>;

export async function addPatientGeneralPractitionerController(input: unknown): Promise<TAddPatientGeneralPractitionerControllerOutput> {
  const parsed = await AddPatientGPValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientGeneralPractitionerUseCase(patient_id, dto as any));
}
