# 5. REST vs GraphQL Transport

This is the actual migration work done in this repo: giving a workflow
action the ability to call a **GraphQL** mutation/query instead of a REST
endpoint, while reusing every other part of the system (the form rendering,
the Zod validation, the permission checks, the `sessionContext` threading)
completely unchanged.

## 5.1 Why add GraphQL at all?

drgodly's FHIR backend historically exposed a REST API
(`FHIR_GQL_URL=http://localhost:8005/api/v1` — yes, the env var is
confusingly named after GraphQL even though it points at the REST base; that's
just history). A **second**, separate project
(`fhir-gql`, a Python/Strawberry GraphQL server) now exposes a real GraphQL
schema over the *same* underlying data — but, as a deliberate proof of
concept, **only for the Patient resource so far**. Everything else
(Appointment, Encounter, Observation, …) is still REST-only.

So the requirement was: let *some* workflow actions call GraphQL while
*most* keep calling REST — inside the very same workflow, even inside the
very same *step* (e.g. "Create Patient" calls GraphQL for the actual
`createPatient` mutation, but still calls REST for populating the Gender
dropdown, because fhir-gql doesn't expose a terminology/value-set query
yet).

## 5.2 The `type` field decides the transport, per action

`WorkflowAction` (`src/types/workflow.ts`) has a `type` field that was
originally just `"http" | "navigate"`. It's now:

```ts
export interface WorkflowAction {
  type: "http" | "graphql" | "navigate";
  url?: string;                    // required for "http"
  method?: "GET" | "POST" | ...;   // required for "http"; ignored for "graphql"
  graphql_document?: string;       // required for "graphql"
  graphql_variables?: string[];    // required for "graphql" (see 5.4)
  graphql_input_fields?: string[]; // optional for "graphql" (see 5.4)
  validation_schema?: string;      // shared by both transports
  // ...
}
```

Side by side, here's the exact same conceptual action — "create a Patient"
— written both ways:

```json
// REST version (what every workflow used to look like)
{
  "type": "http",
  "url": "$fhir_gql_url/patients/",
  "method": "POST",
  "validation_schema": "patient_create_schema"
}
```

```json
// GraphQL version (what create_patient.json actually has today)
{
  "type": "graphql",
  "graphql_document": "create_patient",
  "graphql_input_fields": ["user_id", "org_id", "gender", "birth_date", "..."],
  "validation_schema": "patient_create_schema"
}
```

Same `validation_schema` in both — Zod validation doesn't care which
transport eventually sends the data. `submit/route.ts` (see doc 3) just
branches on `action.type` right before making the call:

```ts
if (action.type === "graphql") {
  data = await runGraphQLResolverOrAction(action.graphql_document, action.graphql_variables,
    action.graphql_input_fields, { ...sessionContext, ...payload }, token);
} else {
  const res = await fetch(resolveUrl(action.url, {...}), { method: action.method, ... });
  data = await res.json();
}
```

`ContextResolverDef` (used for the read-only "pre-fetch this before showing
the form" resolvers, doc 3) got the exact same treatment, so a single step
can mix transports freely — e.g. `create_patient.json` step 2's "confirm
this patient still exists" resolver is GraphQL, while the "load the Name Use
dropdown options" resolver right next to it stays REST:

```json
"context_resolvers": [
  { "tool_name": "get_patient_by_id", "type": "graphql",
    "graphql_document": "get_patient_by_id", "graphql_variables": ["patient_id"] },
  { "tool_name": "get_name_use_valueset", "method": "GET",
    "url": "$fhir_gql_url/terminology/concepts?resource=Patient&field=name.use" }
]
```

## 5.3 The document registry — `schemas/graphql/index.ts`

A workflow JSON action never contains a raw GraphQL query string. It only
carries a short key (`"create_patient"`, `"add_patient_name"`, …) that's
looked up in a registry — exactly the same pattern as `VALIDATION_SCHEMAS`
in doc 4:

```ts
export const GRAPHQL_DOCUMENTS: Record<string, string> = {
  get_patient_by_id: gql`
    query GetPatientById($patientId: Int!) {
      patient(patientId: $patientId) { id }
    }
  `,
  create_patient: gql`
    mutation CreatePatient($input: PatientCreateInput!) {
      createPatient(input: $input) { id }
    }
  `,
  add_patient_name: gql`
    mutation AddPatientName($patientId: Int!, $input: NameCreateInput!) {
      addPatientName(patientId: $patientId, input: $input) { id }
    }
  `,
  // ...11 total, one per Patient query/mutation fhir-gql currently exposes
};
```

Keeping the actual query text out of the workflow JSON means the query can
be edited (add a field, fix a typo) in exactly one place, and every workflow
referencing it picks the change up automatically.

The `gql` used here is *not* the well-known `graphql-tag` package — it's a
tiny local no-op tag (see the file for why):

```ts
const gql = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((acc, s, i) => acc + s + (values[i] ?? ""), "");
```

`graphql-request` (the actual HTTP client, see 5.6) is happy to take a plain
string — no AST parsing needed. The tag only exists so editors that
recognize the ``gql`...` `` convention still syntax-highlight the query.

## 5.4 Building GraphQL variables from `sessionContext`

This is the trickiest part, so it's worth walking through carefully.

A GraphQL mutation like `addPatientName(patientId: Int!, input: NameCreateInput!)`
needs its arguments passed as a **structured `variables` object**:

```json
{ "patientId": 42, "input": { "family": "Doe", "given": ["Jane"] } }
```

...but `sessionContext` (and the Zod-validated `payload`) is a **flat**
object: `{ patient_id: 42, family: "Doe", given: ["Jane"] }`. Two problems
to solve:

1. **Shape** — some values (`patient_id`) go at the top level; others
   (`family`, `given`) need to be nested under `input`.
2. **Case** — GraphQL/Strawberry field names are `camelCase`
   (`patientId`), while everything else in this codebase — sessionContext,
   Zod schemas, REST bodies — is `snake_case` (`patient_id`), matching the
   Python/FHIR side's naming convention.

The chosen design: a workflow JSON author writes **only** the snake_case
context key, in one of two plain arrays, and the executor derives the
camelCase wire name automatically:

```json
{
  "graphql_variables": ["patient_id"],
  "graphql_input_fields": ["use", "family", "given", "prefix", "suffix"]
}
```

`graphql_variables` → flat top-level GraphQL variables. `graphql_input_fields`
→ nested under a variable called `input`. No hand-typed camelCase anywhere.

The conversion utilities (`src/app/api/workflow/_lib.ts`):

```ts
/** "birth_date" -> "birthDate" */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** "birthDate" -> "birth_date" — the inverse, used on GraphQL responses (5.5) */
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function toCamelCaseDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCaseDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [snakeToCamel(k), toCamelCaseDeep(v)]),
    );
  }
  return value;
}
```

And the function that actually builds the `variables` object:

```ts
export function buildGraphQLVariables(
  topLevelKeys: string[] | undefined,
  inputKeys: string[] | undefined,
  merged: Record<string, unknown>,
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  for (const contextKey of topLevelKeys ?? []) {
    const value = merged[contextKey];
    if (value === undefined) continue;                       // ← important, see below
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
```

Worked example — `["patient_id"]` + `["use", "family", "given", "prefix",
"suffix"]` against `merged = { patient_id: 42, use: "official", family: "Doe",
given: ["Jane"] }` produces:

```json
{ "patientId": 42, "input": { "use": "official", "family": "Doe", "given": ["Jane"] } }
```

(`prefix`/`suffix` are simply absent — the user didn't fill them in, so
`merged.prefix` is `undefined`, and the `if (value === undefined) continue`
line skips them entirely rather than sending an empty/null value.)

**Why skip `undefined` explicitly, instead of just letting it flow
through?** Because `JSON.stringify` — which is what actually builds the
HTTP request body — silently *drops* any object key whose value is
`undefined`. If you don't skip it deliberately and log/reason about it,
you get a confusing bug: the field vanishes from the wire with no error at
the point it went missing, and shows up much later as a GraphQL error
about a field that was "never provided." (This is exactly what happened —
see [07-debugging-case-study.md](./07-debugging-case-study.md).)

## 5.5 Normalizing the response back to snake_case

A GraphQL response comes back shaped like the query, in camelCase, wrapped
under the operation's field name:

```json
{ "createPatient": { "id": 88 } }
```

Rather than teaching `extractOutputs()` (doc 3) two different naming
conventions, the executor converts the *whole response* back to snake_case
before returning it:

```ts
export async function runGraphQLResolverOrAction(
  graphqlDocument: string,
  graphqlVariables: string[] | undefined,
  graphqlInputFields: string[] | undefined,
  mergedContext: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown>> {
  const document = GRAPHQL_DOCUMENTS[graphqlDocument];
  if (!document) throw new Error(`Unknown graphql_document "${graphqlDocument}"`);

  const variables = buildGraphQLVariables(graphqlVariables, graphqlInputFields, mergedContext);
  const response = await graphQLClient.request(document, variables, {
    Authorization: `Bearer ${token}`,
  });
  return toSnakeCaseDeep(response) as Record<string, unknown>;
}
```

`{ createPatient: { id: 88 } }` becomes `{ create_patient: { id: 88 } }` —
which is why the workflow JSON's output extraction path is written as
`"field": "create_patient.id"`, not `"createPatient.id"`. `extractOutputs()`
itself (doc 3) never needed to change at all — it just walks a dot-path
through whatever object it's given, and now both transports hand it the
same snake_case shape.

## 5.6 The actual HTTP client — `graphql-request`

One GraphQL client instance, module-level, shared by every call:

```ts
import { GraphQLClient } from "graphql-request";

const graphQLClient = new GraphQLClient(process.env.FHIR_GRAPHQL_URL ?? "");
```

Note `FHIR_GRAPHQL_URL` is a **different** env var from the REST
`FHIR_GQL_URL` — fhir-gql mounts its GraphQL endpoint at the server root
(`http://localhost:8005/graphql`), not under the REST API's `/api/v1`
prefix.

Why `graphql-request` and not Apollo Client or urql? Because every one of
these calls happens **inside a Next.js Route Handler** — server-side,
one-shot, no React component tree, no caching needs. Apollo/urql's entire
value proposition (a normalized cache, `useQuery` hooks reacting to
component renders, cache invalidation on mutation) simply doesn't apply
here. `graphql-request` is a ~5KB wrapper around `fetch` — `client.request
(document, variables, headers)` — which is a near drop-in replacement for
the REST branch's `fetch(url, {...}).then(r => r.json())`. No provider, no
cache, nothing to fight.

## 5.7 What deliberately stays on REST

Not everything moved to GraphQL, and this was a conscious per-action
decision, not an all-or-nothing migration:

- **Terminology/value-set lookups** (`$fhir_gql_url/terminology/concepts?...`)
  stay REST in every Patient step, because fhir-gql's GraphQL schema has no
  terminology query yet — only `patient`/`patients` (queries) and the ten
  `createPatient`/`addPatient*` mutations (mutations) exist there so far.
- **Every other resource's workflows** (Appointment, Encounter, Observation,
  …) are entirely untouched REST — GraphQL was rolled out to exactly one
  resource, on purpose, as a pilot.
- **File uploads** (patient photos) still go through FileNest over its own
  REST API; only the *metadata* record (`{url, content_type, size, title,
  creation}`) that references the already-uploaded file gets created via
  the `add_patient_photo` GraphQL mutation.

---

Next: [06-end-to-end-walkthrough.md](./06-end-to-end-walkthrough.md) — one
complete request traced through every layer above, click to database.
