/**
 * ConditionGraphQLService — GraphQL transport stub for IConditionService.
 *
 * Layer: server / core / condition / infrastructure / services
 *
 * Not yet implemented. Bound by the DI module when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use ConditionRestApiService instead.
 */

import { IConditionService } from "../../domain/interfaces/condition.service.interface";
import {
  type TConditionResponse,
  type TPaginatedConditionResponse,
  type TCreateCondition,
  type TUpdateConditionDto,
  type TListConditionsQuery,
} from "@/modules/entities/schemas/condition";

/**
 * Placeholder implementation — all methods throw until GraphQL is wired.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
export class ConditionGraphQLService implements IConditionService {
  /** @throws Always — not implemented. */
  async create(_dto: TCreateCondition): Promise<TConditionResponse> {
    throw new Error(
      "ConditionGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async list(_query?: TListConditionsQuery): Promise<TPaginatedConditionResponse> {
    throw new Error(
      "ConditionGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async getById(_id: number): Promise<TConditionResponse> {
    throw new Error(
      "ConditionGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async update(_id: number, _dto: TUpdateConditionDto): Promise<TConditionResponse> {
    throw new Error(
      "ConditionGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "ConditionGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
