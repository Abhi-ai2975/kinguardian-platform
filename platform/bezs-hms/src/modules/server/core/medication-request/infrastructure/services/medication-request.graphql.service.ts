/**
 * MedicationRequestGraphQLService — GraphQL transport stub for IMedicationRequestService.
 *
 * Layer: server / core / medication-request / infrastructure / services
 *
 * Not yet implemented. Bound by the DI module when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use MedicationRequestRestApiService instead.
 */

import { IMedicationRequestService } from "../../domain/interfaces/medication-request.service.interface";
import {
  type TMedicationRequestResponse,
  type TPaginatedMedicationRequestResponse,
  type TCreateMedicationRequest,
  type TUpdateMedicationRequestDto,
  type TListMedicationRequestsQuery,
} from "@/modules/entities/schemas/medication-request";

/**
 * Placeholder implementation — all methods throw until GraphQL is wired.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
export class MedicationRequestGraphQLService implements IMedicationRequestService {
  /** @throws Always — not implemented. */
  async create(_dto: TCreateMedicationRequest): Promise<TMedicationRequestResponse> {
    throw new Error(
      "MedicationRequestGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async list(_query?: TListMedicationRequestsQuery): Promise<TPaginatedMedicationRequestResponse> {
    throw new Error(
      "MedicationRequestGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async getById(_id: number): Promise<TMedicationRequestResponse> {
    throw new Error(
      "MedicationRequestGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async update(_id: number, _dto: TUpdateMedicationRequestDto): Promise<TMedicationRequestResponse> {
    throw new Error(
      "MedicationRequestGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "MedicationRequestGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
