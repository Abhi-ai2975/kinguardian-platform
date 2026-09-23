/**
 * createPractitionerFullController — validates input and atomically creates a
 * Practitioner with all of its sub-resources in a single request.
 *
 * Layer: interface-adapters / controllers
 *
 * Uses CreatePractitionerFullValidationSchema to validate the payload before
 * delegating to createPractitionerFullUseCase. Returns the full record.
 */
import { CreatePractitionerFullValidationSchema } from "@/modules/entities/schemas/practitioner";
import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createPractitionerFullUseCase } from "../../application/usecases/createPractitionerFull.usecase";

function presenter(data: TPractitionerResponse) { return data; }
export type TCreatePractitionerFullControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw unknown payload from the server action.
 * @returns The created Practitioner record with all nested sub-resources.
 * @throws InputParseError on Zod validation failure.
 */
export async function createPractitionerFullController(
  input: unknown,
): Promise<TCreatePractitionerFullControllerOutput> {
  const parsed = await CreatePractitionerFullValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await createPractitionerFullUseCase(parsed.data));
}
