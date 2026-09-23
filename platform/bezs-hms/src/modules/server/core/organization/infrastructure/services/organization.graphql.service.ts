/**
 * OrganizationGraphQLService — GraphQL transport stub for IOrganizationsService.
 *
 * Layer: infrastructure / services
 * Resource: Organization (FHIR R4)
 * Transport: GraphQL (fhir-gql GraphQL API — not yet active)
 *
 * This class satisfies the IOrganizationsService contract so the DI container
 * can bind it when FHIR_TRANSPORT=graphql. All methods currently throw
 * "not implemented" — they are placeholders to be filled in once the
 * fhir-gql GraphQL endpoint is available.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "graphql".
 * For REST transport, see organization.rest.service.ts.
 *
 * Environment variables required (when implemented):
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import {
  TListOrgsQuery,
  TOrgResponse,
  TPaginatedOrgResponse,
  TPatchOrgDto,
  TRegisterOrg,
} from "@/modules/entities/schemas/organization";
import { IOrganizationsService } from "../../domain/interfaces/organization.service.interface";

export class OrganizationGraphQLService implements IOrganizationsService {
  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async register(_dto: TRegisterOrg): Promise<TOrgResponse> {
    throw new Error(
      "OrganizationGraphQLService.register is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async list(_query?: TListOrgsQuery): Promise<TPaginatedOrgResponse> {
    throw new Error(
      "OrganizationGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async getById(_id: number): Promise<TOrgResponse> {
    throw new Error(
      "OrganizationGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async update(_id: number, _dto: TPatchOrgDto): Promise<TOrgResponse> {
    throw new Error(
      "OrganizationGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "OrganizationGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }
}
