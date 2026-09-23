/**
 * createPatientController — validates input and creates a new Patient.
 * Layer: interface-adapters / controllers
 */
import { CreatePatientValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createPatientUseCase } from "../../application/usecases/createPatient.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TCreatePatientControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw unknown payload from the server action.
 * @returns The created Patient record.
 * @throws InputParseError on Zod validation failure.
 */
export async function createPatientController(input: unknown): Promise<TCreatePatientControllerOutput> {
  const parsed = await CreatePatientValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await createPatientUseCase(parsed.data));
}
