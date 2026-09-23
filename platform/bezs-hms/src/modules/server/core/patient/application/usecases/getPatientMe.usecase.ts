/**
 * getPatientMeUseCase — fetches the caller's own Patient record.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * @returns The authenticated caller's Patient record.
 */
export async function getPatientMeUseCase(): Promise<TPatientResponse> {
  return getInjection("IPatientsService").getMe();
}
