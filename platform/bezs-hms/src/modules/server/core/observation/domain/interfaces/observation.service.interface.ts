/**
 * Observation service domain interface.
 *
 * Layer: server / core / observation / domain
 */

import type {
  TCreateObservation,
  TUpdateObservationDto,
  TListObservationsQuery,
  TObservationResponse,
  TPaginatedObservationResponse,
} from "@/modules/entities/schemas/observation";

/**
 * Service contract for Observation CRUD operations.
 * Injected via IoC as `IObservationService`.
 */
export interface IObservationService {
  /**
   * Creates a new Observation with all optional child arrays.
   * @param dto - status is required (1..1).
   */
  create(dto: TCreateObservation): Promise<TObservationResponse>;

  /**
   * Returns a paginated list of Observations with optional filters.
   * @param query - Filters (status, patient_id, encounter_id, effective_from/to, limit, offset).
   */
  list(query?: TListObservationsQuery): Promise<TPaginatedObservationResponse>;

  /**
   * Fetches a single Observation by its integer ID.
   * @param id - fhir-gql database ID.
   */
  getById(id: number): Promise<TObservationResponse>;

  /**
   * Partially updates scalar fields on an existing Observation.
   * @param id - fhir-gql database ID.
   * @param dto - Scalar patch payload (child arrays are immutable).
   */
  update(id: number, dto: TUpdateObservationDto): Promise<TObservationResponse>;

  /**
   * Permanently deletes an Observation and all its child records (cascade).
   * @param id - fhir-gql database ID.
   */
  delete(id: number): Promise<void>;
}
