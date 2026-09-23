/**
 * LocationGraphQLService — GraphQL transport stub for ILocationsService.
 *
 * Layer: infrastructure / services
 * Resource: Location (FHIR R4)
 * Transport: GraphQL (fhir-gql GraphQL API — not yet active)
 *
 * This class satisfies the ILocationsService contract so the DI container
 * can bind it when FHIR_TRANSPORT=graphql. All methods currently throw
 * "not implemented" — they are placeholders to be filled in once the
 * fhir-gql GraphQL endpoint is available.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "graphql".
 * For REST transport, see location.rest.service.ts.
 *
 * Environment variables required (when implemented):
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import {
  TCreateLocation,
  TListLocationsQuery,
  TLocationResponse,
  TPaginatedLocationResponse,
  TPatchLocationDto,
} from "@/modules/entities/schemas/location";
import { ILocationsService } from "../../domain/interfaces/location.service.interface";

export class LocationGraphQLService implements ILocationsService {
  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async create(_dto: TCreateLocation): Promise<TLocationResponse> {
    throw new Error(
      "LocationGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async list(_query?: TListLocationsQuery): Promise<TPaginatedLocationResponse> {
    throw new Error(
      "LocationGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async getById(_id: number): Promise<TLocationResponse> {
    throw new Error(
      "LocationGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async update(_id: number, _dto: TPatchLocationDto): Promise<TLocationResponse> {
    throw new Error(
      "LocationGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "LocationGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }
}
