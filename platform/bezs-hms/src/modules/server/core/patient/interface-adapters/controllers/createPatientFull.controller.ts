/**
 * createPatientFullController — validates input and atomically creates a Patient
 * with all of its sub-resources in a single request.
 *
 * Layer: interface-adapters / controllers
 *
 * Uses CreatePatientFullValidationSchema to validate the payload before
 * delegating to createPatientFullUseCase. Returns the full patient record.
 */
import { CreatePatientFullValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createPatientFullUseCase } from "../../application/usecases/createPatientFull.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TCreatePatientFullControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw unknown payload from the server action.
 * @returns The created Patient record with all nested sub-resources.
 * @throws InputParseError on Zod validation failure.
 */
export async function createPatientFullController(
  input: unknown,
): Promise<TCreatePatientFullControllerOutput> {
  const parsed = await CreatePatientFullValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await createPatientFullUseCase(parsed.data));
}
