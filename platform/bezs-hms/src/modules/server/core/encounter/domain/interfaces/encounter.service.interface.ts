/**
 * Encounter service domain interface.
 *
 * Layer: server / core / encounter / domain
 *
 * Defines the contract that all transport implementations (REST, GraphQL) must
 * satisfy. Application use cases depend only on this interface — never on a
 * concrete implementation — keeping the domain layer transport-agnostic.
 *
 * 5 operations map to the 5 fhir-gql encounter routes:
 *   POST   /encounters/      → create
 *   GET    /encounters/{id}  → getById
 *   GET    /encounters/      → list
 *   PATCH  /encounters/{id}  → update
 *   DELETE /encounters/{id}  → delete
 */

import type {
  TCreateEncounter,
  TUpdateEncounterDto,
  TListEncountersQuery,
} from "@/modules/entities/schemas/encounter";
import type {
  TEncounterResponse,
  TPaginatedEncounterResponse,
} from "@/modules/entities/schemas/encounter";

/**
 * Service contract for Encounter CRUD operations.
 * Injected via IoC as `IEncounterService`.
 */
export interface IEncounterService {
  /**
   * Creates a new Encounter with all optional child arrays.
   * status (1..1) is required.
   *
   * @param dto - Full create payload; child arrays are immutable after creation.
   * @returns The newly created Encounter.
   */
  create(dto: TCreateEncounter): Promise<TEncounterResponse>;

  /**
   * Returns a paginated list of Encounters with optional filters.
   *
   * @param query - Filters (status, patient_id, appointment_id, date range, limit, offset).
   * @returns Paginated encounter list.
   */
  list(query?: TListEncountersQuery): Promise<TPaginatedEncounterResponse>;

  /**
   * Fetches a single Encounter by its integer ID.
   *
   * @param id - The encounter's fhir-gql database ID.
   * @returns The Encounter, or throws NotFoundError.
   */
  getById(id: number): Promise<TEncounterResponse>;

  /**
   * Partially updates scalar fields on an existing Encounter.
   * Structural arrays (participant, diagnosis, location, etc.) cannot be updated
   * in-place — delete and re-create the Encounter to change those.
   *
   * @param id - The encounter's fhir-gql database ID.
   * @param dto - Scalar patch payload (status, actual_period_end, priority, etc.).
   * @returns The updated Encounter.
   */
  update(id: number, dto: TUpdateEncounterDto): Promise<TEncounterResponse>;

  /**
   * Permanently deletes an Encounter and all its child records (cascade).
   *
   * @param id - The encounter's fhir-gql database ID.
   * @returns void on success.
   * @throws NotFoundError if the ID does not exist.
   */
  delete(id: number): Promise<void>;
}
