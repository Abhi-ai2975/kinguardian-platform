/**
 * HealthcareServiceGraphQLService — GraphQL transport stub for IHealthcareServicesService.
 *
 * Layer: infrastructure / services
 * Resource: HealthcareService (FHIR R4)
 * Transport: GraphQL (fhir-gql GraphQL API — not yet active)
 *
 * This class satisfies the IHealthcareServicesService contract so the DI
 * container can bind it when FHIR_TRANSPORT=graphql. All methods currently
 * throw "not implemented" — placeholders until the fhir-gql GraphQL endpoint
 * is available.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "graphql".
 * For REST transport, see healthcare-service.rest.service.ts.
 */

import {
  TCreateHealthcareService,
  TListHealthcareServicesQuery,
  THealthcareServiceResponse,
  TPaginatedHealthcareServiceResponse,
  TPatchHealthcareServiceDto,
} from "@/modules/entities/schemas/healthcare-service";
import { IHealthcareServicesService } from "../../domain/interfaces/healthcare-service.service.interface";

export class HealthcareServiceGraphQLService implements IHealthcareServicesService {
  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async create(_dto: TCreateHealthcareService): Promise<THealthcareServiceResponse> {
    throw new Error(
      "HealthcareServiceGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async list(
    _query?: TListHealthcareServicesQuery,
  ): Promise<TPaginatedHealthcareServiceResponse> {
    throw new Error(
      "HealthcareServiceGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async getById(_id: number): Promise<THealthcareServiceResponse> {
    throw new Error(
      "HealthcareServiceGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async update(
    _id: number,
    _dto: TPatchHealthcareServiceDto,
  ): Promise<THealthcareServiceResponse> {
    throw new Error(
      "HealthcareServiceGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }

  /**
   * @throws Error - Not yet implemented. Set FHIR_TRANSPORT=rest to use REST transport.
   */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "HealthcareServiceGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest."
    );
  }
}
