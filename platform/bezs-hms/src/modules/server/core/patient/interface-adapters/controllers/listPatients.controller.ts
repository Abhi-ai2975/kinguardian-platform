/**
 * listPatientsController — validates filters and returns a paginated Patient list.
 * Layer: interface-adapters / controllers
 */
import { ListPatientsValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPaginatedPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientsUseCase } from "../../application/usecases/listPatients.usecase";

function presenter(data: TPaginatedPatientResponse) { return data; }
export type TListPatientsControllerOutput = ReturnType<typeof presenter>;

export async function listPatientsController(input: unknown): Promise<TListPatientsControllerOutput> {
  const parsed = await ListPatientsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await listPatientsUseCase(parsed.data));
}
