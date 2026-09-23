# 6. End-to-End Walkthrough: Creating a Patient

This traces **one complete run** of the `create_patient` workflow, click by
click, through every layer documented in files 1–5. Keep this doc open next
to the others — it's meant to be the "so that's how it all fits together"
payoff.

## Step 0 — Starting the workflow

The user is in the EMR chat UI (`EMRChatContainer.tsx`) and clicks the
"Create Patient" card in the workflow launcher (or types "register a new
patient" and an AI agent picks the same workflow — either path converges
immediately after this).

```ts
// useEmrSend.ts — triggerWorkflowById
const res = await fetch("/api/workflow", {
  method: "POST",
  body: JSON.stringify({
    workflow_id: "create_patient",
    sessionContext: { ...sessionContext, user_id: userId, org_id: orgId },
  }),
});
```

`userId`/`orgId` here are just a *hint* from the client — the server
doesn't trust them blindly (see below).

**Server side** (`route.ts`, doc 3 §3.2):

1. `getServerSession()` confirms the user is actually logged in (doc 4 §4.2
   layer 1).
2. `WORKFLOW_REGISTRY.get("create_patient")` finds the workflow definition
   (doc 3 §3.4) — the authoritative copy, not whatever the client sent.
3. `checkWorkflowPermission` confirms the user holds `patient:create` (doc
   4 §4.2 layer 2).
4. `buildBaseContext(sessionContext, authSession)` **overwrites** whatever
   `user_id`/`org_id` the client claimed with the real values from the
   authenticated session:
   ```ts
   return {
     ...base,
     ...(authSession.user?.id ? { user_id: authSession.user.id } : {}),
     ...(authSession.session?.activeOrganizationId ? { org_id: ... } : {}),
     fhir_gql_url: process.env.FHIR_GQL_URL,
   };
   ```
5. Step 1's `context_resolvers` run — two REST calls (still REST! see doc 5
   §5.7) to populate the Gender and Marital Status dropdowns from fhir-gql's
   terminology endpoint.
6. The server responds with the **full workflow JSON**, step 1's
   definition, the pre-fetched dropdown data, and the freshly-seeded
   `sessionContext`.

## Step 1 — Rendering the first form

**Client side** (`useEmrSend.ts` → `handleWorkflowStartResponse`):

```ts
mergeContext(data.sessionContext);  // Zustand now has { user_id, org_id, fhir_gql_url, ... }

const uiSchema = UI_SCHEMA_REGISTRY[step.ui.schema]; // "patient_create_form"
const parsedUi = buildUiFromData(uiSchema, { ...data.stepData, ...data.sessionContext });
// buildUiFromData → mapDataToUI (doc 2 §2.6) resolves every "$variable" to a literal
```

`parsedUi` is now a fully-resolved `AnyComponentNode` tree — a `Form`
containing a `TerminologySelect` for Gender (its `items` already filled in
from `gender_concepts`), a `DatePicker` for birth date, etc. It's rendered
with:

```tsx
<Renderer processor={processor} surfaceId={`surface-${msg.id}`} component={parsedUi} />
```

...which is the recursive lookup-and-render from doc 2 §2.3.

## Step 2 — Filling in and submitting the form

The user picks "male" for Gender, "2007-07-18" for birth date, checks
"Active", and clicks **Submit**. Inside `catalog/form.tsx` (doc 2 §2.5):

```ts
const formData = collectFormData(); // reads every <input>/<select> by DOM id under this <form>
// → { gender: "male", birth_date: "2007-07-18", active: true, marital_status_code: "UNK", ... }

await sendAction({
  name: "create_patient",
  context: [{ key: "formData", value: { literalString: JSON.stringify(formData) } }],
});
// → processor.dispatch({ userAction: { name: "create_patient", context: {...} } })
```

`useEmrDispatch`'s listener fires (doc 2 §2.4):

```ts
const res = await fetch("/api/workflow/submit", {
  method: "POST",
  body: JSON.stringify({
    workflow: currentWorkflow,     // the whole JSON, re-sent
    stepIndex: 0,
    actionName: "create_patient",
    formData: context,
    sessionContext: { ...currentCtx, ...context },
  }),
});
```

## Step 3 — The server executes the action

**Inside `submit/route.ts`** (doc 3 §3.2, doc 4 §4.1, doc 5):

1. Auth + permission checks repeat (doc 4 §4.2 — every route re-checks).
2. `WORKFLOW_REGISTRY.get(...)` is preferred over the client-sent
   `workflow` (doc 3 §3.4).
3. `cleanFormData(rawFields)` strips empty strings (e.g. an unfilled
   `deceased_datetime: ""` disappears entirely).
4. `patientCreateSchema.safeParse({ ...sessionContext, ...cleaned })` (doc 4
   §4.1) validates the merge of session-carried fields (`user_id`,
   `org_id`) and form-submitted fields (`gender`, `birth_date`, …). If this
   fails, a `422` with a readable message goes straight back — no network
   call happens.
5. `action.type === "graphql"` → the GraphQL branch (doc 5 §5.4–5.6):
   ```ts
   data = await runGraphQLResolverOrAction(
     "create_patient",                       // graphql_document key
     undefined,                              // no top-level graphql_variables for this mutation
     ["user_id", "org_id", "gender", "birth_date", "active", "..."], // graphql_input_fields
     { ...sessionContext, ...payload },
     token,
   );
   ```
   This looks up the `CreatePatient` mutation string in `GRAPHQL_DOCUMENTS`,
   builds `{ input: { userId, orgId, gender, birthDate, active, ... } }`
   (snake_case → camelCase, doc 5 §5.4), and POSTs it to
   `FHIR_GRAPHQL_URL` with `Authorization: Bearer <token>`.
6. fhir-gql's Strawberry resolver runs `createPatient(input)`, inserts the
   row, and returns `{ createPatient: { id: 88 } }`.
7. `toSnakeCaseDeep` (doc 5 §5.5) turns that into `{ create_patient: { id: 88 } }`.
8. `extractOutputs({ patient_id: { field: "create_patient.id" } }, data)`
   (doc 3 §3.3) walks the dot-path and produces `{ patient_id: 88 }`.
9. The response is:
   ```json
   {
     "success": true,
     "data": { "create_patient": { "id": 88 } },
     "nextStepIndex": 1,
     "sessionContext": { "user_id": "...", "org_id": "...", "patient_id": 88, "gender": "male", "..." }
   }
   ```

## Step 4 — Advancing to step 2

**Client side** merges the new `patient_id: 88` into Zustand's
`sessionContext`, then calls `loadWorkflowStep(workflow, 1, newCtx)`, which
`POST`s to `/api/workflow/step`. That route runs step 2's
`context_resolvers` — one of which is now GraphQL too:

```json
{ "tool_name": "get_patient_by_id", "type": "graphql",
  "graphql_document": "get_patient_by_id", "graphql_variables": ["patient_id"] }
```

This confirms Patient 88 really exists before showing the "Add Names" form
— a defensive check in case something deleted the patient between steps.
It runs through the exact same `runGraphQLResolverOrAction` function as
step 1's mutation did; only the document and variable shape differ.

## Step 5 — Repeating for a `RepeatableGroup` step

"Add Names" lets the user add multiple names. Say they add two. On submit,
`formData.names` is an array of two objects. `submit/route.ts`'s
`iterate_key` loop (doc 3 §3.5) fires the `add_patient_name` mutation
**twice**, once per name, each time building fresh GraphQL variables from
that one array element plus `patient_id` from the shared context.

## Step 6 — Completion

This repeats through all 10 steps (some skipped if the user clicks "Skip
this step" — only allowed on steps marked `"optional": true`). After the
last step, `nextStepIndex` comes back `null`, the client shows
`workflow.completion.message` ("Patient registration complete...") and
calls `clearSession()` (Zustand resets `sessionContext`/`activeWorkflow` to
empty) — ready for the next workflow.

## The one thing to internalize

At every single arrow in this chain, the **entire state of the workflow**
travels as plain JSON: the workflow definition, which step you're on, and
every value collected so far. There is no server-side session object, no
in-memory workflow instance, nothing that would be lost if the Next.js
server process restarted between two of these requests. That's what makes
it possible to persist a workflow-in-progress to a database (as the EMR
chat feature does) and resume it exactly where it left off, in a different
browser tab, hours later.

---

Next: [07-debugging-case-study.md](./07-debugging-case-study.md) — a real
bug from this exact workflow, written up as a debugging story.
