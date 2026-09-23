/**
 * updatePatientFullController — validates input and atomically updates a Patient
 * with its sub-resource arrays in a single request.
 *
 * Layer: interface-adapters / controllers
 *
 * Extracts `id` from the validated payload (used as path param) and passes the
 * remaining DTO to updatePatientFullUseCase.
 */
import { UpdatePatientFullValidationSchema } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updatePatientFullUseCase } from "../../application/usecases/updatePatientFull.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TUpdatePatientFullControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw unknown payload from the server action.
 * @returns The updated Patient record with all nested sub-resources.
 * @throws InputParseError on Zod validation failure.
 */
export async function updatePatientFullController(
  input: unknown,
): Promise<TUpdatePatientFullControllerOutput> {
  const parsed = await UpdatePatientFullValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  return presenter(await updatePatientFullUseCase(id, dto));
}
