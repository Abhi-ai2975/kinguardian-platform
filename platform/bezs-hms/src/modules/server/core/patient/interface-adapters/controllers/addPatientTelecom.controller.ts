/**
 * addPatientTelecomController — validates input and adds a Telecom to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientTelecomValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientTelecomUseCase } from "../../application/usecases/addPatientTelecom.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TAddPatientTelecomControllerOutput = ReturnType<typeof presenter>;

export async function addPatientTelecomController(input: unknown): Promise<TAddPatientTelecomControllerOutput> {
  const parsed = await AddPatientTelecomValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientTelecomUseCase(patient_id, dto as any));
}
