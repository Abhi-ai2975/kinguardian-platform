/**
 * listPractitionerAddressesController — validates input and invokes the list-addresses use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { type TPractitionerAddressListResponse } from "@/modules/entities/schemas/practitioner";
import { listPractitionerAddressesUseCase } from "../../application/usecases/listPractitionerAddresses.usecase";

const InputSchema = z.object({ practitionerId: z.number().int().positive() });

function presenter(data: TPractitionerAddressListResponse) {
  return data;
}

export type TListPractitionerAddressesControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId } and lists all addresses for that Practitioner.
 *
 * @param input - Raw unknown value.
 * @returns List response.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerAddressesController(
  input: unknown,
): Promise<TListPractitionerAddressesControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerAddressesUseCase(parsed.data.practitionerId);
  return presenter(data);
}
