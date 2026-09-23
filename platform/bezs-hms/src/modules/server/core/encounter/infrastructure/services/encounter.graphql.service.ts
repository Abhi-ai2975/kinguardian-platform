/**
 * EncounterGraphQLService — GraphQL transport stub for IEncounterService.
 *
 * Layer: server / core / encounter / infrastructure / services
 *
 * Not yet implemented. Bound by the DI module when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use EncounterRestApiService instead.
 */

import { IEncounterService } from "../../domain/interfaces/encounter.service.interface";
import {
  type TEncounterResponse,
  type TPaginatedEncounterResponse,
  type TCreateEncounter,
  type TUpdateEncounterDto,
  type TListEncountersQuery,
} from "@/modules/entities/schemas/encounter";

/**
 * Placeholder implementation — all methods throw until GraphQL is wired.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
export class EncounterGraphQLService implements IEncounterService {
  /** @throws Always — not implemented. */
  async create(_dto: TCreateEncounter): Promise<TEncounterResponse> {
    throw new Error(
      "EncounterGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async list(_query?: TListEncountersQuery): Promise<TPaginatedEncounterResponse> {
    throw new Error(
      "EncounterGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async getById(_id: number): Promise<TEncounterResponse> {
    throw new Error(
      "EncounterGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async update(_id: number, _dto: TUpdateEncounterDto): Promise<TEncounterResponse> {
    throw new Error(
      "EncounterGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "EncounterGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
