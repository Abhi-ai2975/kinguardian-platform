/**
 * ITerminologyService — domain interface for all Terminology operations.
 *
 * Layer: server / core / terminology / domain
 *
 * Maps to the five endpoints exposed by fhir-gql's /terminology router.
 * Use cases call getInjection("ITerminologyService") — transport-agnostic.
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

/**
 * Service contract for the Terminology proxy — covers all five fhir-gql
 * /terminology endpoints.
 */
export interface ITerminologyService {
  /**
   * Full-text search across all loaded terminology concepts.
   * Results ranked by trigram similarity to the query string.
   *
   * @param query - Search query, optional system filter, and pagination.
   * @returns Paginated list of matching concepts.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
   */
  search(query: TSearch): Promise<TSearchResponse>;

  /**
   * Fetches value-set concepts bound to a specific field on a FHIR resource.
   * Used to populate dropdown menus in clinical forms.
   *
   * @param query - Resource name, field name, and optional pagination/filter params.
   * @returns Paginated list of concepts valid for the requested field.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | BadGatewayError
   */
  getConceptsForField(query: TGetConceptsForField): Promise<TConceptsForFieldResponse>;

  /**
   * Looks up a single concept by its canonical code system URL and code.
   * Returns `found: false` instead of throwing when the code does not exist.
   *
   * @param query - The system URL and code to look up.
   * @returns Lookup result with found flag and optional concept details.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
   */
  lookup(query: TLookup): Promise<TLookupResult>;

  /**
   * Bulk concept lookup — resolves multiple system+code pairs in one round-trip.
   * Results are returned in the same order as the input items.
   *
   * @param query - List of system+code pairs (max 100 items).
   * @returns One LookupResult per input item, in input order.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
   */
  lookupBatch(query: TLookupBatch): Promise<TLookupBatchResponse>;

  /**
   * Validates a code against the value-set bound to a FHIR resource field.
   * Respects binding strength — extensible bindings accept codes outside the set.
   *
   * @param query - Resource, field, system, and code to validate.
   * @returns Validation result with `valid`, `in_value_set`, and an explanatory message.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | BadGatewayError
   */
  validate(query: TValidate): Promise<TValidateResponse>;
}
