/**
 * addPatientIdentifierController — validates input and adds a Identifier to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientIdentifierValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientIdentifierUseCase } from "../../application/usecases/addPatientIdentifier.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TAddPatientIdentifierControllerOutput = ReturnType<typeof presenter>;

export async function addPatientIdentifierController(input: unknown): Promise<TAddPatientIdentifierControllerOutput> {
  const parsed = await AddPatientIdentifierValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientIdentifierUseCase(patient_id, dto as any));
}
