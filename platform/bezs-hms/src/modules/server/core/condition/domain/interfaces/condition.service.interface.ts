/**
 * Condition service domain interface.
 *
 * Layer: server / core / condition / domain
 */

import type {
  TCreateCondition,
  TUpdateConditionDto,
  TListConditionsQuery,
  TConditionResponse,
  TPaginatedConditionResponse,
} from "@/modules/entities/schemas/condition";

/**
 * Service contract for Condition CRUD operations.
 * Injected via IoC as `IConditionService`.
 */
export interface IConditionService {
  /**
   * Creates a new Condition with all optional child arrays.
   * @param dto - All fields optional; minimum viable: subject + code_code.
   */
  create(dto: TCreateCondition): Promise<TConditionResponse>;

  /**
   * Returns a paginated list of Conditions with optional filters.
   * @param query - Filters (clinical_status, patient_id, encounter_id, recorded_from/to, limit, offset).
   */
  list(query?: TListConditionsQuery): Promise<TPaginatedConditionResponse>;

  /**
   * Fetches a single Condition by its integer ID.
   * @param id - fhir-gql database ID.
   */
  getById(id: number): Promise<TConditionResponse>;

  /**
   * Partially updates scalar fields on an existing Condition.
   * @param id - fhir-gql database ID.
   * @param dto - Scalar patch payload (child arrays are immutable).
   */
  update(id: number, dto: TUpdateConditionDto): Promise<TConditionResponse>;

  /**
   * Permanently deletes a Condition and all its child records (cascade).
   * @param id - fhir-gql database ID.
   */
  delete(id: number): Promise<void>;
}
