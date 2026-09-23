/**
 * listPatientsUseCase — returns a paginated list of Patients.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TListPatientsQuery, TPaginatedPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * @param query - Optional filters (family_name, given_name, gender, active, user_id, org_id, limit, offset).
 * @returns Paginated Patient records.
 */
export async function listPatientsUseCase(query?: TListPatientsQuery): Promise<TPaginatedPatientResponse> {
  return getInjection("IPatientsService").list(query);
}
