/**
 * MedicationRequest service domain interface.
 *
 * Layer: server / core / medication-request / domain
 */

import type {
  TCreateMedicationRequest,
  TUpdateMedicationRequestDto,
  TListMedicationRequestsQuery,
  TMedicationRequestResponse,
  TPaginatedMedicationRequestResponse,
} from "@/modules/entities/schemas/medication-request";

/**
 * Service contract for MedicationRequest CRUD operations.
 * Injected via IoC as `IMedicationRequestService`.
 */
export interface IMedicationRequestService {
  /**
   * Creates a new MedicationRequest with all optional child arrays.
   * @param dto - status and intent are required.
   */
  create(dto: TCreateMedicationRequest): Promise<TMedicationRequestResponse>;

  /**
   * Returns a paginated list of MedicationRequests with optional filters.
   * @param query - Filters (status, patient_id, encounter_id, authored_from/to, limit, offset).
   */
  list(query?: TListMedicationRequestsQuery): Promise<TPaginatedMedicationRequestResponse>;

  /**
   * Fetches a single MedicationRequest by its integer ID.
   * @param id - fhir-gql database ID.
   */
  getById(id: number): Promise<TMedicationRequestResponse>;

  /**
   * Partially updates scalar fields on an existing MedicationRequest.
   * @param id - fhir-gql database ID.
   * @param dto - Scalar patch payload (child arrays are immutable).
   */
  update(id: number, dto: TUpdateMedicationRequestDto): Promise<TMedicationRequestResponse>;

  /**
   * Permanently deletes a MedicationRequest and all its child records (cascade).
   * @param id - fhir-gql database ID.
   */
  delete(id: number): Promise<void>;
}
