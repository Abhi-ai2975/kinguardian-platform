/**
 * updatePractitionerFullController — validates input and atomically updates a
 * Practitioner with its sub-resource arrays in a single request.
 *
 * Layer: interface-adapters / controllers
 *
 * Extracts `id` from the validated payload (used as path param) and passes the
 * remaining DTO to updatePractitionerFullUseCase.
 */
import { UpdatePractitionerFullValidationSchema } from "@/modules/entities/schemas/practitioner";
import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updatePractitionerFullUseCase } from "../../application/usecases/updatePractitionerFull.usecase";

function presenter(data: TPractitionerResponse) { return data; }
export type TUpdatePractitionerFullControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw unknown payload from the server action.
 * @returns The updated Practitioner record with all nested sub-resources.
 * @throws InputParseError on Zod validation failure.
 */
export async function updatePractitionerFullController(
  input: unknown,
): Promise<TUpdatePractitionerFullControllerOutput> {
  const parsed = await UpdatePractitionerFullValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  return presenter(await updatePractitionerFullUseCase(id, dto));
}
