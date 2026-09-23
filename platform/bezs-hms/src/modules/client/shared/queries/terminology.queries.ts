/**
 * terminology.queries — TanStack Query keys and hooks for all Terminology endpoints.
 *
 * Layer: client / shared / queries
 *
 * Hooks cover all five fhir-gql /terminology endpoints:
 *   useSearchTerminology       → GET  /terminology/search
 *   useConceptsForField        → GET  /terminology/concepts
 *   useLookupTerminology       → POST /terminology/lookup
 *   useLookupBatchTerminology  → POST /terminology/lookup-batch
 *   useValidateTerminology     → POST /terminology/validate
 *
 * Terminology is stable reference data — staleTime defaults to 10 minutes for
 * concepts/lookup/validate, and 30 seconds for free-text search (changes with input).
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getConceptsForFieldAction,
  lookupBatchTerminologyAction,
  lookupTerminologyAction,
  searchTerminologyAction,
  validateTerminologyAction,
} from "@/modules/server/presentation/actions/terminology/terminology.actions";
import type {
  TConceptsForFieldResponse,
  TLookupBatch,
  TLookupBatchResponse,
  TLookupResult,
  TSearchResponse,
  TTerminologySystem,
  TValidate,
  TValidateResponse,
} from "@/modules/entities/schemas/terminology/terminology.schema";

// ── Query key factory ──────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for Terminology queries.
 *
 * @example
 * // Invalidate the entire terminology cache:
 * queryClient.invalidateQueries({ queryKey: terminologyKeys.all })
 */
export const terminologyKeys = {
  /** Root key — invalidate to wipe the entire terminology cache. */
  all: ["terminology"] as const,

  // ── Search ──────────────────────────────────────────────────────────────────
  searches: () => [...terminologyKeys.all, "search"] as const,
  search: (params: { q: string; system?: TTerminologySystem; limit?: number; offset?: number }) =>
    [...terminologyKeys.searches(), params] as const,

  // ── Concepts for field ──────────────────────────────────────────────────────
  conceptsForFields: () => [...terminologyKeys.all, "conceptsForField"] as const,
  conceptsForField: (params: { resource: string; field: string; q?: string; limit?: number; offset?: number }) =>
    [...terminologyKeys.conceptsForFields(), params] as const,

  // ── Lookup ──────────────────────────────────────────────────────────────────
  lookups: () => [...terminologyKeys.all, "lookup"] as const,
  lookup: (params: { system: string; code: string }) =>
    [...terminologyKeys.lookups(), params] as const,

  // ── Lookup batch ────────────────────────────────────────────────────────────
  lookupBatches: () => [...terminologyKeys.all, "lookupBatch"] as const,
  /** system stays string — items come from TLookupBatch (Zod-inferred, open schema). */
  lookupBatch: (items: { system: string; code: string }[]) =>
    [...terminologyKeys.lookupBatches(), items] as const,

  // ── Validate ────────────────────────────────────────────────────────────────
  validations: () => [...terminologyKeys.all, "validate"] as const,
  /** system stays string — params come from TValidate (Zod-inferred, open schema). */
  validate: (params: { resource: string; field: string; system: string; code: string }) =>
    [...terminologyKeys.validations(), params] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Full-text search across all loaded terminology concepts.
 * Disabled when `q` is empty. staleTime is short (30 s) since results change with input.
 *
 * @param q      - Search query string.
 * @param system - Optional canonical code system URL to scope results.
 *                 Use `TERMINOLOGY_SYSTEMS` constants from the schema to avoid typos:
 *                 SNOMED_CT, LOINC, ICD_10_CM, RXNORM.
 * @param limit  - Max results per page (default 20).
 * @param offset - Pagination offset (default 0).
 *
 * @example
 * const { data } = useSearchTerminology("diabetes");
 * const { data } = useSearchTerminology("heart failure", TERMINOLOGY_SYSTEMS.SNOMED_CT, 50, 0);
 */
export function useSearchTerminology(
  q: string,
  system?: TTerminologySystem,
  limit = 20,
  offset = 0,
) {
  return useQuery<TSearchResponse>({
    queryKey: terminologyKeys.search({ q, system, limit, offset }),
    queryFn: async () => {
      const [data, err] = await searchTerminologyAction({
        payload: { q, system, limit, offset },
      });
      if (err) throw new Error(err.message ?? "Failed to search terminology");
      return data!;
    },
    staleTime: 30_000,
    enabled: q.trim().length > 0,
  });
}

/**
 * Fetches value-set concepts bound to a FHIR resource field.
 * Used to populate `<Select>` dropdowns in clinical forms.
 * Cached for 10 minutes — terminology concepts are stable reference data.
 *
 * @param resource - FHIR resource type, e.g. "Organization".
 * @param field    - Field name, e.g. "type".
 * @param q        - Optional free-text filter within the bound value set.
 * @param limit    - Max concepts to return (default 200).
 * @param offset   - Pagination offset (default 0).
 *
 * @example
 * const { data, isLoading } = useConceptsForField("Organization", "type");
 * const { data } = useConceptsForField("Condition", "clinicalStatus", "active", 50);
 */
export function useConceptsForField(
  resource: string,
  field: string,
  q?: string,
  limit = 200,
  offset = 0,
) {
  return useQuery<TConceptsForFieldResponse>({
    queryKey: terminologyKeys.conceptsForField({ resource, field, q, limit, offset }),
    queryFn: async () => {
      const [data, err] = await getConceptsForFieldAction({
        payload: { resource, field, q, limit, offset },
      });
      if (err) throw new Error(err.message ?? "Failed to load terminology concepts");
      return data!;
    },
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(resource) && Boolean(field),
  });
}

/**
 * Looks up a single concept by its canonical system URL and code.
 * Returns `found: false` when the code does not exist.
 * Cached for 10 minutes — code system data is stable.
 *
 * @param system  - Canonical code system URL.
 * @param code    - The code to look up.
 * @param enabled - Set to false to skip the query (e.g. while input is incomplete).
 *
 * @example
 * const { data } = useLookupTerminology("http://snomed.info/sct", "73211009");
 */
export function useLookupTerminology(
  system: string,
  code: string,
  enabled = true,
) {
  return useQuery<TLookupResult>({
    queryKey: terminologyKeys.lookup({ system, code }),
    queryFn: async () => {
      const [data, err] = await lookupTerminologyAction({
        payload: { system, code },
      });
      if (err) throw new Error(err.message ?? "Failed to look up concept");
      return data!;
    },
    staleTime: 10 * 60 * 1000,
    enabled: enabled && Boolean(system) && Boolean(code),
  });
}

/**
 * Bulk concept lookup — resolves multiple system+code pairs in one request.
 * Useful for pre-resolving all codes present in a submitted form.
 * Cached for 10 minutes.
 *
 * @param query   - List of system+code pairs (max 100 items).
 * @param enabled - Set to false to skip the query.
 *
 * @example
 * const { data } = useLookupBatchTerminology({ items: [{ system: "...", code: "..." }] });
 */
export function useLookupBatchTerminology(
  query: TLookupBatch,
  enabled = true,
) {
  return useQuery<TLookupBatchResponse>({
    queryKey: terminologyKeys.lookupBatch(query.items),
    queryFn: async () => {
      const [data, err] = await lookupBatchTerminologyAction({ payload: query });
      if (err) throw new Error(err.message ?? "Failed to bulk-look up concepts");
      return data!;
    },
    staleTime: 10 * 60 * 1000,
    enabled: enabled && query.items.length > 0,
  });
}

/**
 * Validates a code against the value-set bound to a FHIR resource field.
 * Cached for 10 minutes — binding constraints are stable reference data.
 *
 * @param query   - Resource, field, system, and code to validate.
 * @param enabled - Set to false to skip the query.
 *
 * @example
 * const { data } = useValidateTerminology({
 *   resource: "Condition",
 *   field: "clinicalStatus",
 *   system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
 *   code: "active",
 * });
 */
export function useValidateTerminology(
  query: TValidate,
  enabled = true,
) {
  return useQuery<TValidateResponse>({
    queryKey: terminologyKeys.validate(query),
    queryFn: async () => {
      const [data, err] = await validateTerminologyAction({ payload: query });
      if (err) throw new Error(err.message ?? "Failed to validate concept");
      return data!;
    },
    staleTime: 10 * 60 * 1000,
    enabled:
      enabled &&
      Boolean(query.resource) &&
      Boolean(query.field) &&
      Boolean(query.system) &&
      Boolean(query.code),
  });
}
