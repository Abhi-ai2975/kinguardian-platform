/**
 * addPatientAddressController — validates input and adds a Address to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientAddressValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientAddressUseCase } from "../../application/usecases/addPatientAddress.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TAddPatientAddressControllerOutput = ReturnType<typeof presenter>;

export async function addPatientAddressController(input: unknown): Promise<TAddPatientAddressControllerOutput> {
  const parsed = await AddPatientAddressValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientAddressUseCase(patient_id, dto as any));
}
