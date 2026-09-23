/**
 * IHealthcareServicesService — domain interface for HealthcareService resource operations.
 *
 * Layer: domain / interfaces
 * Resource: HealthcareService (FHIR R4)
 *
 * Defines the contract that HealthcareServiceRestApiService /
 * HealthcareServiceGraphQLService (infrastructure layer) must satisfy. All
 * use cases depend on this interface rather than the concrete service so the
 * implementation can be swapped or mocked without touching application logic.
 */

import {
  TListHealthcareServicesQuery,
  TPaginatedHealthcareServiceResponse,
  THealthcareServiceResponse,
  TCreateHealthcareService,
  TPatchHealthcareServiceDto,
} from "@/modules/entities/schemas/healthcare-service";

export interface IHealthcareServicesService {
  /**
   * Creates a new healthcare service via the fhir-gql API.
   * @param dto - Creation payload; every field is optional except each
   *              sub-resource's own required fields (identifier.value, etc.).
   * @returns The created healthcare service record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  create(dto: TCreateHealthcareService): Promise<THealthcareServiceResponse>;

  /**
   * Returns a paginated list of healthcare services with optional filters.
   * @param query - name substring, active flag, limit, offset.
   * @returns Paginated result: { total, limit, offset, data }.
   * @throws UnauthorizedError | BadGatewayError
   */
  list(query?: TListHealthcareServicesQuery): Promise<TPaginatedHealthcareServiceResponse>;

  /**
   * Fetches a single healthcare service by its numeric FHIR Server ID.
   * @param id - The fhir-gql primary key for this healthcare service.
   * @returns The matching healthcare service record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  getById(id: number): Promise<THealthcareServiceResponse>;

  /**
   * Partially updates a healthcare service (PATCH semantics — scalar +
   * photo fields only, no array sub-resources).
   * @param id  - The fhir-gql primary key.
   * @param dto - Fields to change (at least one must be provided).
   * @returns The updated healthcare service record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  update(id: number, dto: TPatchHealthcareServiceDto): Promise<THealthcareServiceResponse>;

  /**
   * Permanently deletes a healthcare service.
   * @param id - The fhir-gql primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  delete(id: number): Promise<void>;
}
