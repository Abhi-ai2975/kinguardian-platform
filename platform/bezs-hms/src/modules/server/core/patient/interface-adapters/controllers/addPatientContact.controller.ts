/**
 * addPatientContactController — validates input and adds a Contact to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientContactValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientContactUseCase } from "../../application/usecases/addPatientContact.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TAddPatientContactControllerOutput = ReturnType<typeof presenter>;

export async function addPatientContactController(input: unknown): Promise<TAddPatientContactControllerOutput> {
  const parsed = await AddPatientContactValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientContactUseCase(patient_id, dto as any));
}
