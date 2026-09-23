/**
 * addPatientCommunicationController — validates input and adds a Communication to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientCommunicationValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientCommunicationUseCase } from "../../application/usecases/addPatientCommunication.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TAddPatientCommunicationControllerOutput = ReturnType<typeof presenter>;

export async function addPatientCommunicationController(input: unknown): Promise<TAddPatientCommunicationControllerOutput> {
  const parsed = await AddPatientCommunicationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientCommunicationUseCase(patient_id, dto as any));
}
