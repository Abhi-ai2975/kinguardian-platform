# 3. The Workflow Engine

Location in the repo:
- Workflow JSON files: `src/modules/client/ai-hub/workflows/**/*.json`
- Type definitions: `src/types/workflow.ts`
- Server routes: `src/app/api/workflow/{route.ts, step/route.ts, submit/route.ts, _lib.ts, _registry.ts}`

A **workflow** is a multi-step wizard described entirely as JSON. "Create
Patient" is a workflow with 10 steps (create the core Patient, then
optionally add names, identifiers, phone numbers, addresses, languages, an
emergency contact, linked doctors, a photo, and links to other records).
Nothing about *how* to render each step or *what* to do when it's submitted
is hard-coded in React — it's all declared in
`src/modules/client/ai-hub/workflows/patient/create_patient.json`.

## 3.1 Anatomy of a workflow JSON file

Here is `create_patient.json`'s first step, trimmed to the essentials
(the real file has 10 steps like this):

```json
{
  "id": "create_patient",
  "name": "Create Patient",
  "required_permissions": ["patient:create"],
  "workflow_steps": [
    {
      "sequence_number": 1,
      "id": "create_patient_resource",
      "step_type": "form",
      "context": {
        "inputs": {},
        "outputs": {
          "patient_id": { "type": "integer", "field": "create_patient.id" }
        }
      },
      "context_resolvers": [
        {
          "context_key": "gender_concepts",
          "tool_name": "get_gender_valueset",
          "url": "$fhir_gql_url/terminology/concepts?resource=Patient&field=gender",
          "method": "GET"
        }
      ],
      "ui": { "schema": "patient_create_form", "mode": "create" },
      "actions": [
        {
          "type": "graphql",
          "tool_name": "create_patient",
          "graphql_document": "create_patient",
          "graphql_input_fields": ["user_id", "org_id", "gender", "birth_date", "..."],
          "validation_schema": "patient_create_schema",
          "retryable": true
        }
      ]
    }
  ]
}
```

Reading this like a checklist:

| Field | Meaning |
|---|---|
| `context.inputs` | What this step *needs* from earlier steps (e.g. step 2 needs `patient_id` from step 1). |
| `context.outputs` | What this step *produces* for later steps to use, and where to find it in the response (`field: "create_patient.id"`). |
| `context_resolvers` | Read-only calls to run **before** showing the form — e.g. "fetch the list of valid Gender codes for the dropdown." |
| `ui.schema` | Which UI schema (see doc 2) to render as the form — looked up by name in a separate registry. |
| `actions` | What to do **when the form is submitted** — call a REST endpoint or a GraphQL mutation (doc 5 covers this split in depth). |

`WorkflowAction` and `ContextResolverDef` (in `src/types/workflow.ts`) are
the TypeScript types that pin down exactly what fields are legal here —
worth reading directly, they're the "API contract" for every workflow JSON
file in the repo.

## 3.2 The three server routes

A workflow's life cycle is driven entirely by three Next.js route handlers.
Crucially: **the server keeps no memory between requests.** Every request
carries the *entire* workflow definition and everything collected so far —
this is what makes it possible to close your laptop mid-workflow and resume
later from a database snapshot.

```
┌──────────────┐   1. "register a new patient"    ┌───────────────────┐
│   Browser    │ ───────────────────────────────▶ │ POST /api/workflow │
│  (chat UI)   │ ◀─────────────────────────────── │  (route.ts)        │
└──────────────┘   workflow + step 0 + sessionContext └───────────────────┘

┌──────────────┐   2. user submits step's form     ┌────────────────────┐
│   Browser    │ ───────────────────────────────▶ │ POST /api/workflow/ │
│              │ ◀─────────────────────────────── │   submit           │
└──────────────┘   result + nextStepIndex + sessionContext └───────────┘

┌──────────────┐   3. load the next step's form     ┌────────────────────┐
│   Browser    │ ───────────────────────────────▶ │ POST /api/workflow/ │
│              │ ◀─────────────────────────────── │   step              │
└──────────────┘   step + pre-fetched data + sessionContext └───────────┘
```

Steps 2 and 3 repeat until there are no more steps.

### `POST /api/workflow` — start a workflow

Two ways to arrive here: the user typed a free-text message (an external AI
agent picks the workflow), or the user clicked a workflow card directly
(`workflow_id` is sent, no AI involved). Either way, it ends the same:

```ts
// route.ts (simplified)
let mergedContext = buildBaseContext(sessionContext, authSession);
//   buildBaseContext seeds mergedContext.user_id / .org_id from the
//   AUTHENTICATED session — never trust whatever the client claims here.

if (firstStep.context_resolvers?.length) {
  stepData = await runContextResolvers(firstStep.context_resolvers, mergedContext, token);
  mergedContext = { ...mergedContext, ...stepData, ...extractOutputs(...) };
}

return Response.json({
  type: "workflow_step",
  workflow,        // the FULL definition — the client caches this for the whole session
  step: firstStep,
  stepData,
  sessionContext: mergedContext,
});
```

This is the **only** place `user_id`/`org_id` get seeded from the real,
authenticated session (`getServerSession()`). Every later request just
re-sends whatever `sessionContext` it was last given — which is exactly why
the bug in
[07-debugging-case-study.md](./07-debugging-case-study.md)
happened the way it did.

### `POST /api/workflow/submit` — execute one step's action

This is where user-entered form data actually gets sent to the FHIR
backend. Simplified to the core flow:

```ts
// submit/route.ts
const cleaned = cleanFormData(rawFields);       // strip "", null, undefined, NaN
const result = schema.safeParse({ ...sessionContext, ...cleaned }); // Zod (doc 4)
const payload = result.data;

if (action.type === "graphql") {
  data = await runGraphQLResolverOrAction(
    action.graphql_document, action.graphql_variables, action.graphql_input_fields,
    { ...sessionContext, ...payload }, token,
  );
} else {
  const res = await fetch(resolveUrl(action.url, { ...sessionContext, ...cleaned }), {
    method: action.method,
    body: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
  data = await res.json();
}

const outputs = extractOutputs(step.context.outputs, data);
const updatedContext = { ...sessionContext, ...cleaned, ...outputs };
return Response.json({ success: true, data, nextStepIndex, sessionContext: updatedContext });
```

Doc 5 covers the `action.type === "graphql"` branch (and the plain `fetch`
REST branch next to it) in much more depth — that split is the whole point
of today's migration work.

### `POST /api/workflow/step` — load a step's form

Used to advance to the next step (after a successful submit) or to jump
straight to a step (skip an optional one). Its job: run that step's
`context_resolvers` (read-only pre-fetches, like populating a dropdown) and
hand back the step + fresh data.

```ts
// step/route.ts
if (step.context_resolvers?.length) {
  stepData = await runContextResolvers(step.context_resolvers, mergedContext, token);
  mergedContext = { ...mergedContext, ...stepData, ...extractOutputs(...) };
}
return Response.json({ type: "workflow_step", step, stepData, sessionContext: mergedContext });
```

It also implements the `skip_unless` feature: a step can declare
`"skip_unless": "some_flag"`, and this route walks forward past any step
whose flag isn't truthy in `sessionContext` — letting a workflow branch
without the client needing to know the branching logic.

## 3.3 Shared helpers — `_lib.ts`

All three routes import from one shared file to avoid duplicating logic:

- **`sortedSteps(steps)`** — workflow JSON makes no ordering guarantee, so
  every route sorts by `sequence_number` before indexing.
- **`resolveUrl(template, context)`** — for REST actions, turns
  `"$fhir_gql_url/patients/$patient_id"` into a real URL by substituting
  `$variable` placeholders from the merged context.
- **`extractOutputs(outputSpec, response)`** — pulls named values out of a
  response using a dot-path (`field: "create_patient.id"` → walks
  `response.create_patient.id`). This function doesn't care whether the
  response came from REST or GraphQL — see doc 5 for why that matters.
- **`cleanFormData(data)`** — strips `""`/`null`/`undefined`/`NaN` values
  before anything gets validated or sent. An unfilled optional field should
  simply be *absent*, not present-with-an-empty-value.
- **`getJWTToken()`** — every FHIR call (REST or GraphQL) authenticates with
  a short-lived JWT obtained fresh, per request, from Better Auth's JWT
  plugin — covered in doc 4.

## 3.4 The registry — `_registry.ts`

Every workflow JSON file is imported once into a `Map<string, WorkflowEntry>`
called `WORKFLOW_REGISTRY`, keyed by the workflow's `id`. This is the
**single source of truth** for "what does this workflow currently look
like" — as opposed to whatever copy of the workflow JSON a particular
browser tab happens to be holding onto (which could be stale if the JSON
changed on the server after that tab loaded it).

```ts
// submit/route.ts
const workflow = WORKFLOW_REGISTRY.get(clientWorkflow.id)?.workflow ?? clientWorkflow;
```

This "prefer the registry, fall back to whatever the client sent" pattern
matters more than it looks — see
[07-debugging-case-study.md](./07-debugging-case-study.md) for a real bug
that happened because one of the three routes *didn't* do this.

## 3.5 Repeating a sub-form N times — `iterate_key`

Several of Patient's sub-steps ("Add Names", "Add Identifiers", "Add
Addresses", …) use a `RepeatableGroup` UI component that lets the user add
0, 1, or 5 entries in one form. The action for that step sets
`"iterate_key": "names"`, and `submit/route.ts` loops:

```ts
const items = cleaned[action.iterate_key]; // e.g. cleaned.names = [ {...}, {...} ]
for (const raw of items) {
  const item = cleanFormData(raw);
  const itemPayload = schema.safeParse({ ...sessionContext, ...item }).data;
  lastData = await /* submit itemPayload, once per array element */;
}
```

So if a user adds two names in the repeatable group, the `add_patient_name`
mutation/endpoint is called **twice**, once per name — the workflow JSON
never needs to know how many the user added.

---

Next: [04-validation-and-security.md](./04-validation-and-security.md) —
how form data is validated/transformed (Zod) before it's ever sent
anywhere, and how every request is authenticated and permission-checked.
