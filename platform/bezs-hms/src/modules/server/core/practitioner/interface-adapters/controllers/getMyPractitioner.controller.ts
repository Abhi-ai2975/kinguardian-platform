/**
 * getMyPractitionerController — invokes the getMe use case for the authenticated caller.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 *
 * No input parsing — userId is resolved from the JWT by fhir-gql GET /practitioners/me.
 */

import { type TPractitionerResponse } from "@/modules/entities/schemas/practitioner";
import { getMyPractitionerUseCase } from "../../application/usecases/getMyPractitioner.usecase";

function presenter(data: TPractitionerResponse) {
  return data;
}

export type TGetMyPractitionerControllerOutput = ReturnType<typeof presenter>;

/**
 * Delegates to getMyPractitionerUseCase — no input validation needed.
 *
 * @returns The Practitioner resource for the authenticated user.
 */
export async function getMyPractitionerController(): Promise<TGetMyPractitionerControllerOutput> {
  const data = await getMyPractitionerUseCase();
  return presenter(data);
}
