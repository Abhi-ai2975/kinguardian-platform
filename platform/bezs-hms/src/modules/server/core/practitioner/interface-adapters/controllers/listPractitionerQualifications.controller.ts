/**
 * listPractitionerQualificationsController — validates input and invokes the list-qualifications use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { type TPractitionerQualificationListResponse } from "@/modules/entities/schemas/practitioner";
import { listPractitionerQualificationsUseCase } from "../../application/usecases/listPractitionerQualifications.usecase";

const InputSchema = z.object({ practitionerId: z.number().int().positive() });

function presenter(data: TPractitionerQualificationListResponse) {
  return data;
}

export type TListPractitionerQualificationsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId } and lists all qualifications for that Practitioner.
 *
 * @param input - Raw unknown value.
 * @returns List response.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerQualificationsController(
  input: unknown,
): Promise<TListPractitionerQualificationsControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerQualificationsUseCase(parsed.data.practitionerId);
  return presenter(data);
}
