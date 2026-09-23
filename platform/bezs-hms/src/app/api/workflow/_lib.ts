/**
 * Shared utilities for the /api/workflow route family.
 *
 * Layer: app / api / workflow
 *
 * All three routes (route.ts, step/route.ts, submit/route.ts) import from here
 * to avoid duplicating token fetching, URL interpolation, and data-mapping logic.
 *
 * Token strategy: every server-side request to the FHIR server or the external
 * agent uses a short-lived JWT obtained from Better Auth's JWT plugin endpoint.
 * The token is fetched fresh per request by forwarding the current session cookie,
 * so it always reflects the caller's identity and expiry.
 *
 * Transport: every workflow action/context resolver is REST by default. A
 * resolver/action can opt into GraphQL instead by setting `type: "graphql"`
 * plus `graphql_document`/`graphql_variables` — see runGraphQLResolverOrAction()
 * below and GRAPHQL_DOCUMENTS (schemas/graphql/index.ts). Pilot scope: only
 * the create_patient workflow's Patient calls use GraphQL so far, since
 * fhir-gql only exposes a GraphQL schema for that one resource.
 */

import { GraphQLClient } from "graphql-request";
import type {
  WorkflowStepDefinition,
  StepContextOutput,
  ContextResolverDef,
} from "@/types/workflow";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { GRAPHQL_DOCUMENTS } from "@/modules/client/ai-hub/schemas/graphql";

// Re-export under the name used throughout the workflow routes.
export { getAuthToken as getJWTToken };

// Single GraphQL client for the whole workflow engine — fhir-gql mounts its
// GraphQL endpoint at server root (e.g. http://localhost:8005/graphql),
// distinct from FHIR_GQL_URL which is the REST base (.../api/v1). Pilot
// scope: only the create_patient workflow's Patient actions use this so far.
const graphQLClient = new GraphQLClient(process.env.FHIR_GRAPHQL_URL ?? "");

/**
 * Returns workflow steps sorted by sequence_number ascending.
 * The workflow JSON from the external agent makes no ordering guarantee,
 * so we always sort before indexing by position.
 *
 * @param steps - Unsorted workflow step definitions.
 * @returns Steps sorted by sequence_number.
 */
export function sortedSteps(
  steps: WorkflowStepDefinition[],
): WorkflowStepDefinition[] {
  return [...steps].sort((a, b) => a.sequence_number - b.sequence_number);
}

/**
 * Interpolates `$variable` placeholders in a URL template using values from
 * the session context.
 *
 * Example:
 *   template: "$fhir_gql_url/patients/$patient_id/identifiers"
 *   context:  { patient_id: 42 }
 *   result:   "https://fhir.example.com/patients/42/identifiers"
 *
 * Unknown keys are replaced with an empty string to avoid leaving raw
 * placeholders in the URL.
 *
 * @param template - URL string with $variable placeholders.
 * @param context  - Key-value map to substitute into the template.
 * @returns Interpolated URL string.
 */
export function resolveUrl(
  template: string,
  context: Record<string, unknown>,
): string {
  const fhirBase = (process.env.FHIR_GQL_URL ?? "").replace(/\/$/, "");
  const merged: Record<string, unknown> = {
    fhir_gql_url: fhirBase,
    ...context,
  };
  const resolved = template.replace(/\$(\w+)/g, (_, key) =>
    String(merged[key] ?? ""),
  );

  // Workflow definitions may use bare relative paths (e.g. /api/v1/...) without
  // a $fhir_gql_url prefix. Prepend the base URL so fetch gets an absolute URL.
  if (resolved.startsWith("/")) {
    return `${fhirBase}${resolved}`;
  }
  return resolved;
}

/**
 * Maps a FHIR response onto the step's declared output contract.
 *
 * Each entry in `outputs` optionally specifies a `field` — the top-level
 * response key (or dot-notation path) to pluck. When `field` is absent the
 * entire response object is stored under the output key.
 *
 * @param outputs  - Step context output definitions from the workflow JSON.
 * @param response - The raw FHIR API response body.
 * @returns Flat key-value map of extracted output values.
 */
export function extractOutputs(
  outputs: Record<string, StepContextOutput>,
  response: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(outputs)) {
    if (!def.field) {
      result[key] = response;
    } else {
      // Dot-notation path support: "me_patient.id" traverses nested objects.
      const value = def.field
        .split(".")
        .reduce<unknown>(
          (acc, k) =>
            acc != null && typeof acc === "object"
              ? (acc as Record<string, unknown>)[k]
              : undefined,
          response,
        );
      // Skip undefined so an output absent from one response doesn't overwrite
      // a value already set by a different call.
      if (value !== undefined) result[key] = value;
    }
  }
  return result;
}

/**
 * Strips empty, null, and undefined values from form data before sending to
 * the FHIR server. Optional fields left blank by the user should not be
 * included in the request body.
 *
 * @param data - Raw form data from the client.
 * @returns Cleaned payload with empty/null/NaN values removed.
 */
export function cleanFormData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      value !== "" &&
      value !== undefined &&
      value !== null &&
      !(typeof value === "number" && isNaN(value))
    ) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Runs multiple context resolvers in parallel and merges all results into a
 * single flat object.
 *
 * @param resolvers      - Array of resolver definitions from the workflow step.
 * @param sessionContext - Current accumulated session context.
 * @param token          - Bearer JWT to authenticate FHIR requests.
 * @returns Merged key-value map from all resolver responses.
 */
export async function runContextResolvers(
  resolvers: ContextResolverDef[],
  sessionContext: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown>> {
  const results = await Promise.all(
    resolvers.map((r) => runContextResolver(r, sessionContext, token)),
  );
  return Object.assign({}, ...results);
}

/**
 * Executes a single step context resolver — a preliminary GET (or POST) against
 * the FHIR server to hydrate the latest resource state before the form is shown.
 *
 * @param resolver       - Resolver definition from the workflow step.
 * @param sessionContext - Current accumulated session context (used for URL interpolation).
 * @param token          - Bearer JWT to authenticate the request.
 * @returns Resolver response, optionally nested under context_key.
 * @throws Error if the FHIR server returns a non-2xx status.
 */
export async function runContextResolver(
  resolver: NonNullable<WorkflowStepDefinition["context_resolver"]>,
  sessionContext: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown>> {
  if (resolver.type === "graphql") {
    if (!resolver.graphql_document) {
      throw new Error(
        `Context resolver "${resolver.tool_name}" declares type "graphql" but no graphql_document.`,
      );
    }
    const body = await runGraphQLResolverOrAction(
      resolver.graphql_document,
      resolver.graphql_variables,
      resolver.graphql_input_fields,
      sessionContext,
      token,
    );
    return resolver.context_key ? { [resolver.context_key]: body } : body;
  }

  if (!resolver.url || !resolver.method) {
    throw new Error(
      `Context resolver "${resolver.tool_name}" is missing url/method for the REST transport.`,
    );
  }
  const url = resolveUrl(resolver.url, sessionContext);
  const res = await fetch(url, {
    method: resolver.method,
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: resolver.timeout_ms
      ? AbortSignal.timeout(resolver.timeout_ms)
      : undefined,
  });
  if (!res.ok) throw new Error(`Context resolver failed: ${res.status}`);
  const body = await res.json();
  return resolver.context_key ? { [resolver.context_key]: body } : body;
}

/** "birth_date" -> "birthDate". Only touches snake_case (a-z0-9 plus underscore). */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** "birthDate" -> "birth_date". Inverse of snakeToCamel. */
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * Recursively rekeys every object key from snake_case to camelCase — arrays
 * are mapped element-wise, scalars pass through untouched. Used to build
 * GraphQL variables from sessionContext (which is snake_case throughout, to
 * match the REST/Zod side of the engine).
 */
function toCamelCaseDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCaseDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        toCamelCaseDeep(v),
      ]),
    );
  }
  return value;
}

/**
 * Recursively rekeys every object key from camelCase to snake_case — the
 * inverse of toCamelCaseDeep(). Applied to every GraphQL response so the rest
 * of the engine (extractOutputs, Zod schemas, sessionContext) only ever sees
 * snake_case field names, regardless of transport.
 */
function toSnakeCaseDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSnakeCaseDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        camelToSnake(k),
        toSnakeCaseDeep(v),
      ]),
    );
  }
  return value;
}

/**
 * Builds a GraphQL `variables` object from sessionContext using a step's
 * declared `graphql_variables` (flat top-level args) and `graphql_input_fields`
 * (nested under `input`). Every context key is looked up as-is (snake_case)
 * and auto camelCased on the way out — authors never hand-type a camelCase
 * field name, which removes the exact failure mode of a mistyped/forgotten
 * cased key. Keys whose resolved value is `undefined` are omitted entirely
 * (mirrors cleanFormData's REST-side handling of empty/absent fields) rather
 * than being sent as an explicit key with an undefined value that then
 * silently vanishes mid-JSON-serialization.
 *
 * @param topLevelKeys - graphql_variables from the workflow action/resolver, if any.
 * @param inputKeys    - graphql_input_fields from the workflow action/resolver, if any.
 * @param merged       - Combined sessionContext + cleaned form data to read from.
 * @returns A variables object ready to pass to the GraphQL client.
 */
export function buildGraphQLVariables(
  topLevelKeys: string[] | undefined,
  inputKeys: string[] | undefined,
  merged: Record<string, unknown>,
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  for (const contextKey of topLevelKeys ?? []) {
    const value = merged[contextKey];
    if (value === undefined) continue;
    variables[snakeToCamel(contextKey)] = toCamelCaseDeep(value);
  }

  if (inputKeys?.length) {
    const input: Record<string, unknown> = {};
    for (const contextKey of inputKeys) {
      const value = merged[contextKey];
      if (value === undefined) continue;
      input[snakeToCamel(contextKey)] = toCamelCaseDeep(value);
    }
    variables.input = input;
  }

  return variables;
}

/**
 * Executes a GraphQL action or context resolver — the GraphQL counterpart of
 * runContextResolver()/the REST fetch() in submit/route.ts. Looks up the
 * query/mutation document by name from GRAPHQL_DOCUMENTS (fails loudly on a
 * missing key, unlike the validation-schema lookup, since there is no
 * sensible fallback for "run without a query").
 *
 * @param graphqlDocument    - Key into GRAPHQL_DOCUMENTS (action/resolver's `graphql_document`).
 * @param graphqlVariables   - Flat top-level context keys (action/resolver's `graphql_variables`).
 * @param graphqlInputFields - Context keys nested under `input` (action/resolver's `graphql_input_fields`).
 * @param mergedContext      - Combined sessionContext + cleaned form data.
 * @param token              - Bearer JWT to authenticate the request.
 * @returns The GraphQL response's `data`, rekeyed to snake_case and keyed by
 *          operation name (e.g. `{ create_patient: { id } }`).
 * @throws Error if `graphqlDocument` has no registry entry, or the GraphQL server returns errors.
 */
export async function runGraphQLResolverOrAction(
  graphqlDocument: string,
  graphqlVariables: string[] | undefined,
  graphqlInputFields: string[] | undefined,
  mergedContext: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown>> {
  const document = GRAPHQL_DOCUMENTS[graphqlDocument];
  if (!document) {
    throw new Error(
      `Unknown graphql_document "${graphqlDocument}" — no entry in GRAPHQL_DOCUMENTS.`,
    );
  }
  const variables = buildGraphQLVariables(graphqlVariables, graphqlInputFields, mergedContext);
  const response = await graphQLClient.request(document, variables, {
    Authorization: `Bearer ${token}`,
  });
  return toSnakeCaseDeep(response) as Record<string, unknown>;
}
