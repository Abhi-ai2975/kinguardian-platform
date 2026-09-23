/**
 * ObservationGraphQLService — GraphQL transport stub for IObservationService.
 *
 * Layer: server / core / observation / infrastructure / services
 *
 * Not yet implemented. Bound by the DI module when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use ObservationRestApiService instead.
 */

import { IObservationService } from "../../domain/interfaces/observation.service.interface";
import {
  type TObservationResponse,
  type TPaginatedObservationResponse,
  type TCreateObservation,
  type TUpdateObservationDto,
  type TListObservationsQuery,
} from "@/modules/entities/schemas/observation";

/**
 * Placeholder implementation — all methods throw until GraphQL is wired.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
export class ObservationGraphQLService implements IObservationService {
  /** @throws Always — not implemented. */
  async create(_dto: TCreateObservation): Promise<TObservationResponse> {
    throw new Error(
      "ObservationGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async list(_query?: TListObservationsQuery): Promise<TPaginatedObservationResponse> {
    throw new Error(
      "ObservationGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async getById(_id: number): Promise<TObservationResponse> {
    throw new Error(
      "ObservationGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async update(_id: number, _dto: TUpdateObservationDto): Promise<TObservationResponse> {
    throw new Error(
      "ObservationGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "ObservationGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
