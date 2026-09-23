/**
 * addPatientLinkController — validates input and adds a Link to a Patient.
 * Layer: interface-adapters / controllers
 */
import { AddPatientLinkValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addPatientLinkUseCase } from "../../application/usecases/addPatientLink.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TAddPatientLinkControllerOutput = ReturnType<typeof presenter>;

export async function addPatientLinkController(input: unknown): Promise<TAddPatientLinkControllerOutput> {
  const parsed = await AddPatientLinkValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { patient_id, ...dto } = parsed.data;
  return presenter(await addPatientLinkUseCase(patient_id, dto as any));
}
