/**
 * IPractitionerRolesService — domain interface for the PractitionerRole resource.
 *
 * Layer: server / core / practitioner-role / domain
 *
 * Defines the contract that all transport implementations (REST, GraphQL) must
 * satisfy. Use cases depend only on this interface; the concrete implementation
 * is resolved by the DI container at runtime.
 *
 * Unlike IPractitionersService, this interface has only 6 methods — PractitionerRole
 * has no separate sub-resource CRUD routes; all child arrays are included in the
 * create payload and returned embedded in every GET response.
 */

import {
  TPractitionerRoleResponse,
  TPaginatedPractitionerRoleResponse,
  TPaginatedPractitionerRoleBookingResponse,
} from "@/modules/entities/schemas/practitioner-role";
import {
  TCreatePractitionerRole,
  TPractitionerRolePatchDto,
  TListPractitionerRolesQuery,
  TListPractitionerRolesForBookingQuery,
} from "@/modules/entities/schemas/practitioner-role";

/**
 * Contract for all PractitionerRole operations.
 * Implemented by PractitionerRoleRestApiService and PractitionerRoleGraphQLService.
 */
export interface IPractitionerRolesService {
  /**
   * Creates a new PractitionerRole with all inline sub-resources atomically.
   * @param dto - Creation payload including optional child arrays.
   * @returns The created PractitionerRole resource.
   */
  create(dto: TCreatePractitionerRole): Promise<TPractitionerRoleResponse>;

  /**
   * Lists PractitionerRoles with optional filters and pagination.
   * @param query - Optional filter/pagination params.
   * @returns Paginated list of PractitionerRoles.
   */
  list(query?: TListPractitionerRolesQuery): Promise<TPaginatedPractitionerRoleResponse>;

  /**
   * Lists PractitionerRoles enriched with Practitioner detail for booking UIs.
   * Calls GET /practitioner-roles/booking — must be registered before /{id}.
   * @param query - Optional specialty/day_of_week/active filter params.
   * @returns Paginated booking-enriched list.
   */
  listForBooking(query?: TListPractitionerRolesForBookingQuery): Promise<TPaginatedPractitionerRoleBookingResponse>;

  /**
   * Fetches a single PractitionerRole by numeric ID.
   * @param id - PractitionerRole DB id.
   * @returns The PractitionerRole resource with all embedded child arrays.
   * @throws NotFoundError when the id does not exist.
   */
  getById(id: number): Promise<TPractitionerRoleResponse>;

  /**
   * Patches scalar fields on an existing PractitionerRole.
   * Child arrays cannot be patched — recreate the role to change them.
   * @param id - PractitionerRole DB id.
   * @param dto - Partial scalar fields to update.
   * @returns The updated PractitionerRole resource.
   */
  update(id: number, dto: TPractitionerRolePatchDto): Promise<TPractitionerRoleResponse>;

  /**
   * Deletes a PractitionerRole record and all related child records (cascade).
   * @param id - PractitionerRole DB id.
   */
  delete(id: number): Promise<void>;
}
