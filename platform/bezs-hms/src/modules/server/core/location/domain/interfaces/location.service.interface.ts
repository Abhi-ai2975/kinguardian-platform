/**
 * ILocationsService — domain interface for Location resource operations.
 *
 * Layer: domain / interfaces
 * Resource: Location (FHIR R4)
 *
 * Defines the contract that LocationRestApiService / LocationGraphQLService
 * (infrastructure layer) must satisfy. All use cases depend on this interface
 * rather than the concrete service so the implementation can be swapped or
 * mocked without touching application logic.
 */

import {
  TListLocationsQuery,
  TPaginatedLocationResponse,
  TLocationResponse,
  TCreateLocation,
  TPatchLocationDto,
} from "@/modules/entities/schemas/location";

export interface ILocationsService {
  /**
   * Creates a new location via the fhir-gql API.
   * @param dto - user_id, org_id (both required), and optional FHIR fields.
   * @returns The created location record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  create(dto: TCreateLocation): Promise<TLocationResponse>;

  /**
   * Returns a paginated list of locations with optional filters.
   * @param query - org_id, status, limit, offset.
   * @returns Paginated result: { total, limit, offset, data }.
   * @throws UnauthorizedError | BadGatewayError
   */
  list(query?: TListLocationsQuery): Promise<TPaginatedLocationResponse>;

  /**
   * Fetches a single location by its numeric FHIR Server ID.
   * @param id - The fhir-gql primary key for this location.
   * @returns The matching location record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  getById(id: number): Promise<TLocationResponse>;

  /**
   * Partially updates a location (PATCH semantics — scalar fields only).
   * @param id  - The fhir-gql primary key.
   * @param dto - Fields to change (at least one must be provided).
   * @returns The updated location record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  update(id: number, dto: TPatchLocationDto): Promise<TLocationResponse>;

  /**
   * Permanently deletes a location.
   * @param id - The fhir-gql primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  delete(id: number): Promise<void>;
}
