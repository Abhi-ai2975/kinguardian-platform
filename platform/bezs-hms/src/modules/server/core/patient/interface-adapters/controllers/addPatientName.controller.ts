/**
 * addPatientNameController — validates input and adds a Name to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientNameValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientNameUseCase } from "../../application/usecases/addPatientName.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TAddPatientNameControllerOutput = ReturnType<typeof presenter>;

export async function addPatientNameController(input: unknown): Promise<TAddPatientNameControllerOutput> {
  const parsed = await AddPatientNameValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientNameUseCase(patient_id, dto as any));
}
