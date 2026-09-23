/**
 * Zod schemas and inferred TypeScript types for the Terminology resource.
 *
 * Layer: entities / schemas
 * Resource: Terminology (fhir-gql /terminology proxy)
 *
 * Mirrors all five fhir-gql /terminology Pydantic models exactly.
 *
 * Schema groups:
 *  1. ConceptResponse       — a single clinical concept (shared sub-schema)
 *  2. ValueSetResponse      — a bound value-set descriptor (shared sub-schema)
 *  3. SearchResponse        — paginated full-text search results
 *  4. ConceptsForFieldResponse — concepts allowed for a FHIR resource field
 *  5. LookupResult          — single concept lookup result
 *  6. LookupBatchResponse   — bulk lookup results
 *  7. ValidateResponse      — code validation result against a field binding
 *  8. Input / action schemas — ZSA transport-layer input wrappers
 */

import { z } from "zod";

// ── Well-known terminology system URLs ────────────────────────────────────────
// Use these constants wherever a `system` parameter is required so callers
// never hardcode canonical URLs and typos silently return zero results.

/**
 * Canonical code system URLs supported by the fhir-gql /terminology endpoints.
 *
 * @example
 * const { data } = useSearchTerminology("diabetes", TERMINOLOGY_SYSTEMS.SNOMED_CT);
 * const { data } = useLookupTerminology(TERMINOLOGY_SYSTEMS.LOINC, "8867-4");
 */
export const TERMINOLOGY_SYSTEMS = {
  /** SNOMED CT — clinical findings, disorders, procedures, substances. */
  SNOMED_CT: "http://snomed.info/sct",
  /** LOINC — lab tests, clinical observations, vital signs. */
  LOINC: "http://loinc.org",
  /** ICD-10-CM — diagnoses and condition codes (US clinical modification). */
  ICD_10_CM: "http://hl7.org/fhir/sid/icd-10-cm",
  /** RxNorm — normalized drug names and codes. */
  RXNORM: "http://www.nlm.nih.gov/research/umls/rxnorm",
} as const;

/** Union type of all supported terminology system URLs. */
export type TTerminologySystem = (typeof TERMINOLOGY_SYSTEMS)[keyof typeof TERMINOLOGY_SYSTEMS];

// ── Shared sub-resource response schemas ───────────────────────────────────────
// All optional API fields use .nullish() — the API may return explicit JSON null.

/**
 * A single terminology concept as returned by search, lookup, and concepts endpoints.
 * Mirrors fhir-gql's ConceptResponse.
 */
export const ConceptResponseSchema = z.object({
  id: z.number(),
  code: z.string(),
  display: z.string(),
  /** Full textual definition of the concept — may be null for some code systems. */
  definition: z.string().nullish(),
  active: z.boolean(),
  /** Canonical URL of the code system this concept belongs to. */
  system: z.string(),
  /** Human-readable code system name, e.g. "SNOMED CT". */
  system_name: z.string(),
});
export type TConceptResponse = z.infer<typeof ConceptResponseSchema>;

/**
 * A FHIR value set — a defined collection of allowed concepts for a field.
 * Mirrors fhir-gql's ValueSetResponse.
 */
export const ValueSetResponseSchema = z.object({
  id: z.number(),
  canonical_url: z.string(),
  name: z.string(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  version: z.string().nullish(),
  /** Binding strength: required | extensible | preferred | example */
  binding_strength: z.string(),
  active: z.boolean(),
});
export type TValueSetResponse = z.infer<typeof ValueSetResponseSchema>;

// ── Top-level response schemas ─────────────────────────────────────────────────

/**
 * Paginated results from GET /terminology/search.
 * Concepts are ranked by trigram similarity to the query string.
 * Mirrors fhir-gql's SearchResponse.
 */
export const SearchResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(ConceptResponseSchema),
});
export type TSearchResponse = z.infer<typeof SearchResponseSchema>;

/**
 * Response from GET /terminology/concepts — value-set concepts bound to a
 * specific field on a FHIR resource. Used to populate dropdown menus in forms.
 * Mirrors fhir-gql's ConceptsForFieldResponse.
 */
export const ConceptsForFieldResponseSchema = z.object({
  resource: z.string(),
  field: z.string(),
  value_set: ValueSetResponseSchema.nullish(),
  binding_strength: z.string().nullish(),
  multiple_allowed: z.boolean(),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  concepts: z.array(ConceptResponseSchema),
});
export type TConceptsForFieldResponse = z.infer<typeof ConceptsForFieldResponseSchema>;

/**
 * Result of a single POST /terminology/lookup.
 * Returns `found: false` (not a 404) when the code does not exist — callers
 * can handle unknown codes without catching exceptions.
 * Mirrors fhir-gql's LookupResult.
 */
export const LookupResultSchema = z.object({
  found: z.boolean(),
  /** Full concept details — present only when found=true. */
  concept: ConceptResponseSchema.nullish(),
  /** Code system metadata — present only when found=true. */
  code_system: z.record(z.string(), z.unknown()).nullish(),
});
export type TLookupResult = z.infer<typeof LookupResultSchema>;

/**
 * Results of POST /terminology/lookup-batch — one LookupResult per input item,
 * in the same order as the input.
 * Mirrors fhir-gql's LookupBatchResponse.
 */
export const LookupBatchResponseSchema = z.object({
  results: z.array(LookupResultSchema),
});
export type TLookupBatchResponse = z.infer<typeof LookupBatchResponseSchema>;

/**
 * Result of POST /terminology/validate — whether a code is acceptable for a
 * given FHIR resource field given its binding strength.
 * Mirrors fhir-gql's ValidateResponse.
 */
export const ValidateResponseSchema = z.object({
  valid: z.boolean(),
  in_value_set: z.boolean(),
  /** Binding strength for the field: required | extensible | preferred | example */
  binding_strength: z.string().nullish(),
  concept: ConceptResponseSchema.nullish(),
  value_set: ValueSetResponseSchema.nullish(),
  /** Human-readable explanation of the validation result. */
  message: z.string(),
});
export type TValidateResponse = z.infer<typeof ValidateResponseSchema>;

// ── Input / validation schemas ─────────────────────────────────────────────────

/** Query parameters for GET /terminology/search. */
export const SearchValidationSchema = z.object({
  /** Required full-text search query, e.g. "diabetes", "heart failure". */
  q: z.string().min(1),
  /** Optional canonical code system URL to scope the search. */
  system: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TSearch = z.infer<typeof SearchValidationSchema>;

/** Query parameters for GET /terminology/concepts. */
export const GetConceptsForFieldValidationSchema = z.object({
  /** FHIR resource type, e.g. "Organization", "Condition". */
  resource: z.string().min(1),
  /** Field name on that resource, e.g. "type", "clinicalStatus". */
  field: z.string().min(1),
  /** Optional full-text filter within the bound value set. */
  q: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TGetConceptsForField = z.infer<typeof GetConceptsForFieldValidationSchema>;

/** Request body for POST /terminology/lookup. */
export const LookupValidationSchema = z.object({
  /** Canonical URL of the code system, e.g. "http://snomed.info/sct". */
  system: z.string().min(1),
  /** The concept code to look up, e.g. "73211009". */
  code: z.string().min(1),
});
export type TLookup = z.infer<typeof LookupValidationSchema>;

/** A single system+code pair within a batch lookup. */
export const LookupBatchItemSchema = z.object({
  system: z.string().min(1),
  code: z.string().min(1),
});
export type TLookupBatchItem = z.infer<typeof LookupBatchItemSchema>;

/** Request body for POST /terminology/lookup-batch. */
export const LookupBatchValidationSchema = z.object({
  /** List of system+code pairs to look up (max 100 items). */
  items: z.array(LookupBatchItemSchema).min(1).max(100),
});
export type TLookupBatch = z.infer<typeof LookupBatchValidationSchema>;

/** Request body for POST /terminology/validate. */
export const ValidateValidationSchema = z.object({
  /** FHIR resource type to validate against, e.g. "Condition". */
  resource: z.string().min(1),
  /** Field name on that resource, e.g. "clinicalStatus". */
  field: z.string().min(1),
  /** Canonical URL of the code system the code belongs to. */
  system: z.string().min(1),
  /** The code to validate. */
  code: z.string().min(1),
});
export type TValidate = z.infer<typeof ValidateValidationSchema>;

// ── Action schemas (ZSA transport-layer input) ────────────────────────────────
// All terminology operations are reads — no transportOptions.

/** Action schema for GET /terminology/search. */
export const SearchActionSchema = z.object({
  payload: SearchValidationSchema,
});
export type TSearchAction = z.infer<typeof SearchActionSchema>;

/** Action schema for GET /terminology/concepts. */
export const GetConceptsForFieldActionSchema = z.object({
  payload: GetConceptsForFieldValidationSchema,
});
export type TGetConceptsForFieldAction = z.infer<typeof GetConceptsForFieldActionSchema>;

/** Action schema for POST /terminology/lookup. */
export const LookupActionSchema = z.object({
  payload: LookupValidationSchema,
});
export type TLookupAction = z.infer<typeof LookupActionSchema>;

/** Action schema for POST /terminology/lookup-batch. */
export const LookupBatchActionSchema = z.object({
  payload: LookupBatchValidationSchema,
});
export type TLookupBatchAction = z.infer<typeof LookupBatchActionSchema>;

/** Action schema for POST /terminology/validate. */
export const ValidateActionSchema = z.object({
  payload: ValidateValidationSchema,
});
export type TValidateAction = z.infer<typeof ValidateActionSchema>;
