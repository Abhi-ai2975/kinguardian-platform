/**
 * ServiceRequestGraphQLService — GraphQL transport stub for IServiceRequestService.
 *
 * Layer: server / core / service-request / infrastructure / services
 *
 * Not yet implemented. Bound by the DI module when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use ServiceRequestRestApiService instead.
 */

import { IServiceRequestService } from "../../domain/interfaces/service-request.service.interface";
import {
  type TServiceRequestResponse,
  type TPaginatedServiceRequestResponse,
  type TCreateServiceRequest,
  type TUpdateServiceRequestDto,
  type TListServiceRequestsQuery,
} from "@/modules/entities/schemas/service-request";

/**
 * Placeholder implementation — all methods throw until GraphQL is wired.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
export class ServiceRequestGraphQLService implements IServiceRequestService {
  /** @throws Always — not implemented. */
  async create(_dto: TCreateServiceRequest): Promise<TServiceRequestResponse> {
    throw new Error(
      "ServiceRequestGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async list(_query?: TListServiceRequestsQuery): Promise<TPaginatedServiceRequestResponse> {
    throw new Error(
      "ServiceRequestGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async getById(_id: number): Promise<TServiceRequestResponse> {
    throw new Error(
      "ServiceRequestGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async update(_id: number, _dto: TUpdateServiceRequestDto): Promise<TServiceRequestResponse> {
    throw new Error(
      "ServiceRequestGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "ServiceRequestGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
