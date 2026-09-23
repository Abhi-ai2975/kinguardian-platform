/**
 * ServiceRequest service domain interface.
 *
 * Layer: server / core / service-request / domain
 */

import type {
  TCreateServiceRequest,
  TUpdateServiceRequestDto,
  TListServiceRequestsQuery,
  TServiceRequestResponse,
  TPaginatedServiceRequestResponse,
} from "@/modules/entities/schemas/service-request";

/**
 * Service contract for ServiceRequest CRUD operations.
 * Injected via IoC as `IServiceRequestService`.
 */
export interface IServiceRequestService {
  /**
   * Creates a new ServiceRequest with all optional child arrays.
   * @param dto - status and intent are required.
   * @returns The created ServiceRequest.
   */
  create(dto: TCreateServiceRequest): Promise<TServiceRequestResponse>;

  /**
   * Returns a paginated list of ServiceRequests with optional filters.
   * @param query - Filters (status, patient_id, encounter_id, authored_from/to, limit, offset).
   */
  list(query?: TListServiceRequestsQuery): Promise<TPaginatedServiceRequestResponse>;

  /**
   * Fetches a single ServiceRequest by its integer ID.
   * @param id - fhir-gql database ID.
   */
  getById(id: number): Promise<TServiceRequestResponse>;

  /**
   * Partially updates scalar fields on an existing ServiceRequest.
   * @param id - fhir-gql database ID.
   * @param dto - Scalar patch payload.
   */
  update(id: number, dto: TUpdateServiceRequestDto): Promise<TServiceRequestResponse>;

  /**
   * Permanently deletes a ServiceRequest and all its child records (cascade).
   * @param id - fhir-gql database ID.
   */
  delete(id: number): Promise<void>;
}
