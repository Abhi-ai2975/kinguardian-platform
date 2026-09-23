/**
 * patchPatientAddressController — validates input and updates a specific Address on a Patient.
 * Layer: interface-adapters / controllers
 */
import { PatchPatientAddressValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { patchPatientAddressUseCase } from "../../application/usecases/patchPatientAddress.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TPatchPatientAddressControllerOutput = ReturnType<typeof presenter>;

export async function patchPatientAddressController(input: unknown): Promise<TPatchPatientAddressControllerOutput> {
  const parsed = await PatchPatientAddressValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, item_id, ...dto } = parsed.data;
  return presenter(await patchPatientAddressUseCase(patient_id, item_id, dto as any));
}
