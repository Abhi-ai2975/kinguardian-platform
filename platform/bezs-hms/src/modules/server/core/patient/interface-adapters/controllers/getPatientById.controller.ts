/**
 * getPatientByIdController — fetches a single Patient by ID.
 * Layer: interface-adapters / controllers
 */
import { GetPatientByIdValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getPatientByIdUseCase } from "../../application/usecases/getPatientById.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TGetPatientByIdControllerOutput = ReturnType<typeof presenter>;

export async function getPatientByIdController(input: unknown): Promise<TGetPatientByIdControllerOutput> {
  const parsed = await GetPatientByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await getPatientByIdUseCase(parsed.data.id));
}
