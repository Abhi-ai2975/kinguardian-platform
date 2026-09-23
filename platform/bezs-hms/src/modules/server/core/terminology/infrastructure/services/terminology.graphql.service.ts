/**
 * TerminologyGraphQLService — GraphQL transport stub for ITerminologyService.
 *
 * Layer: server / core / terminology / infrastructure / services
 * Transport: GraphQL  (bound when FHIR_TRANSPORT=graphql)
 *
 * Not yet implemented. Set FHIR_TRANSPORT=rest (default) to use the REST implementation.
 * All methods throw immediately so a misconfigured transport fails loudly at runtime.
 */

import {
  TConceptsForFieldResponse,
  TGetConceptsForField,
  TLookup,
  TLookupBatch,
  TLookupBatchResponse,
  TLookupResult,
  TSearch,
  TSearchResponse,
  TValidate,
  TValidateResponse,
} from "@/modules/entities/schemas/terminology/terminology.schema";
import { ITerminologyService } from "../../domain/interfaces/terminology.service.interface";

/**
 * Placeholder GraphQL implementation — throws on every call until implemented.
 * Bound by the DI module when FHIR_TRANSPORT=graphql.
 */
export class TerminologyGraphQLService implements ITerminologyService {
  /** @throws Error always */
  async search(_query: TSearch): Promise<TSearchResponse> {
    throw new Error(
      "TerminologyGraphQLService.search is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Error always */
  async getConceptsForField(
    _query: TGetConceptsForField,
  ): Promise<TConceptsForFieldResponse> {
    throw new Error(
      "TerminologyGraphQLService.getConceptsForField is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Error always */
  async lookup(_query: TLookup): Promise<TLookupResult> {
    throw new Error(
      "TerminologyGraphQLService.lookup is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Error always */
  async lookupBatch(_query: TLookupBatch): Promise<TLookupBatchResponse> {
    throw new Error(
      "TerminologyGraphQLService.lookupBatch is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Error always */
  async validate(_query: TValidate): Promise<TValidateResponse> {
    throw new Error(
      "TerminologyGraphQLService.validate is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
