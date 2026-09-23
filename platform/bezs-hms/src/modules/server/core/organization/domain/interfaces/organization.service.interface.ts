/**
 * IOrganizationsService — domain interface for Organization resource operations.
 *
 * Layer: domain / interfaces
 * Resource: Organization (FHIR R4)
 *
 * Defines the contract that OrganizationService (infrastructure layer) must satisfy.
 * All use cases depend on this interface rather than the concrete service so the
 * implementation can be swapped or mocked without touching application logic.
 */

import {
  TListOrgsQuery,
  TPaginatedOrgResponse,
  TOrgResponse,
  TRegisterOrg,
  TPatchOrgDto,
} from "@/modules/entities/schemas/organization";

export interface IOrganizationsService {
  /**
   * Registers a new organization via the fhir-gql API.
   * @param dto - Name, type[], and optional FHIR fields.
   * @returns The created organization record.
   * @throws ValidationError | ConflictError | UnauthorizedError | BadGatewayError
   */
  register(dto: TRegisterOrg): Promise<TOrgResponse>;

  /**
   * Returns a paginated list of organizations with optional filters.
   * @param query - name substring, active flag, limit, offset.
   * @returns Paginated result: { total, limit, offset, data }.
   * @throws UnauthorizedError | BadGatewayError
   */
  list(query?: TListOrgsQuery): Promise<TPaginatedOrgResponse>;

  /**
   * Fetches a single organization by its numeric FHIR Server ID.
   * @param id - The fhir-gql primary key for this organization.
   * @returns The matching organization record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  getById(id: number): Promise<TOrgResponse>;

  /**
   * Partially updates an organization (PATCH semantics).
   * Only `active`, `name`, and `partof_display` are patchable.
   * @param id  - The fhir-gql primary key.
   * @param dto - Fields to change (at least one must be provided).
   * @returns The updated organization record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  update(id: number, dto: TPatchOrgDto): Promise<TOrgResponse>;

  /**
   * Permanently deletes an organization and all its child records.
   * The fhir-gql API returns 204 No Content on success.
   * @param id - The fhir-gql primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  delete(id: number): Promise<void>;
}
