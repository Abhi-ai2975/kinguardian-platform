/**
 * PractitionerRoleGraphQLService — GraphQL transport stub.
 *
 * Layer: server / core / practitioner-role / infrastructure / services
 *
 * Stub implementation of IPractitionerRolesService for GraphQL transport.
 * Not yet implemented — all methods throw NotImplementedError.
 *
 * Bound by the DI module when FHIR_TRANSPORT=graphql.
 */

import { IPractitionerRolesService } from "../../domain/interfaces/practitioner-role.service.interface";
import {
  type TPractitionerRoleResponse,
  type TPaginatedPractitionerRoleResponse,
  type TPaginatedPractitionerRoleBookingResponse,
} from "@/modules/entities/schemas/practitioner-role";
import {
  type TCreatePractitionerRole,
  type TPractitionerRolePatchDto,
  type TListPractitionerRolesQuery,
  type TListPractitionerRolesForBookingQuery,
} from "@/modules/entities/schemas/practitioner-role";

/** Stub — GraphQL transport not yet implemented for PractitionerRole. */
export class PractitionerRoleGraphQLService implements IPractitionerRolesService {
  create(_dto: TCreatePractitionerRole): Promise<TPractitionerRoleResponse> {
    throw new Error("PractitionerRoleGraphQLService.create: not implemented");
  }

  list(_query?: TListPractitionerRolesQuery): Promise<TPaginatedPractitionerRoleResponse> {
    throw new Error("PractitionerRoleGraphQLService.list: not implemented");
  }

  listForBooking(_query?: TListPractitionerRolesForBookingQuery): Promise<TPaginatedPractitionerRoleBookingResponse> {
    throw new Error("PractitionerRoleGraphQLService.listForBooking: not implemented");
  }

  getById(_id: number): Promise<TPractitionerRoleResponse> {
    throw new Error("PractitionerRoleGraphQLService.getById: not implemented");
  }

  update(_id: number, _dto: TPractitionerRolePatchDto): Promise<TPractitionerRoleResponse> {
    throw new Error("PractitionerRoleGraphQLService.update: not implemented");
  }

  delete(_id: number): Promise<void> {
    throw new Error("PractitionerRoleGraphQLService.delete: not implemented");
  }
}
