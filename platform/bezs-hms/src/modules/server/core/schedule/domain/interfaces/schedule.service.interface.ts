/**
 * ISchedulesService — domain interface for Schedule resource operations.
 *
 * Layer: domain / interfaces
 * Resource: Schedule (FHIR R4)
 *
 * Defines the contract that ScheduleRestApiService / ScheduleGraphQLService
 * (infrastructure layer) must satisfy. All use cases depend on this
 * interface rather than the concrete service so the implementation can be
 * swapped or mocked without touching application logic.
 */

import {
  TListSchedulesQuery,
  TPaginatedScheduleResponse,
  TScheduleResponse,
  TCreateSchedule,
  TPatchScheduleDto,
} from "@/modules/entities/schemas/schedule";

export interface ISchedulesService {
  /**
   * Creates a new schedule via the fhir-gql API.
   * @param dto - Creation payload; every field is optional except each
   *              sub-resource's own required fields (identifier.value, actor.reference).
   * @returns The created schedule record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  create(dto: TCreateSchedule): Promise<TScheduleResponse>;

  /**
   * Returns a paginated list of schedules with optional filters.
   * @param query - active flag, limit, offset.
   * @returns Paginated result: { total, limit, offset, data }.
   * @throws UnauthorizedError | BadGatewayError
   */
  list(query?: TListSchedulesQuery): Promise<TPaginatedScheduleResponse>;

  /**
   * Fetches a single schedule by its numeric FHIR Server ID.
   * @param id - The fhir-gql primary key for this schedule.
   * @returns The matching schedule record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  getById(id: number): Promise<TScheduleResponse>;

  /**
   * Partially updates a schedule (PATCH semantics — scalar fields only:
   * active, comment, planning_horizon_start, planning_horizon_end).
   * @param id  - The fhir-gql primary key.
   * @param dto - Fields to change (at least one must be provided).
   * @returns The updated schedule record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  update(id: number, dto: TPatchScheduleDto): Promise<TScheduleResponse>;

  /**
   * Permanently deletes a schedule and cascades to all its Slots.
   * @param id - The fhir-gql primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  delete(id: number): Promise<void>;
}
