/**
 * patchPractitionerAddressController — validates input and invokes the patch-address use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  PatchPractitionerAddressValidationSchema,
  type TPractitionerAddressResponse,
} from "@/modules/entities/schemas/practitioner";
import { patchPractitionerAddressUseCase } from "../../application/usecases/patchPractitionerAddress.usecase";

function presenter(data: TPractitionerAddressResponse) {
  return data;
}

export type TPatchPractitionerAddressControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId, addressId, ...dto } and delegates to patchPractitionerAddressUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The updated address record.
 * @throws InputParseError on schema validation failure.
 */
export async function patchPractitionerAddressController(
  input: unknown,
): Promise<TPatchPractitionerAddressControllerOutput> {
  const parsed = await PatchPractitionerAddressValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, addressId, ...dto } = parsed.data;
  const data = await patchPractitionerAddressUseCase(practitionerId, addressId, dto);
  return presenter(data);
}
