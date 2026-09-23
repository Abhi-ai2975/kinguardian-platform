# 7. Debugging Case Study: "Field 'userId' ... was not provided"

This is a real bug that came up while testing the GraphQL migration
described in [05-rest-vs-graphql-transport.md](./05-rest-vs-graphql-transport.md).
It's written up in full, including the wrong turns, because **how you debug
a system like this** is at least as useful to learn as the system itself.

## The symptom

Submitting the "Create Patient" form failed with:

```
⚠️ Variable '$input' got invalid value {...}; Field 'userId' of required
type 'String!' was not provided.
```

The `variables` actually sent were visible in the error's `request` field:

```json
{
  "input": {
    "orgId": "f5ea33b0-...",
    "gender": "male",
    "birthDate": "1999-06-21",
    "active": true,
    "deceasedBoolean": false,
    "maritalStatusCode": "UNK"
  }
}
```

Notice: `orgId` is there, correctly camelCased. `gender`, `birthDate`,
`active`, `deceasedBoolean` are all there too. **Only `userId` is missing —
not present with an empty value, just completely absent as a key.**

## Wrong turn #1: "it must be a casing bug"

The first instinct was: "we just built a snake_case → camelCase converter
(doc 5 §5.4) — maybe it's mishandling `user_id` specifically." But look
again at the evidence: every *other* field converted correctly. If the
conversion function itself were broken, it would be broken for every field,
not selectively for one. This was a useful check to rule out quickly rather
than assume — **read the evidence literally before theorizing**.

## Wrong turn #2: "the workflow definition is stale"

Digging into `buildGraphQLVariables` (doc 5 §5.4):

```ts
for (const contextKey of topLevelKeys ?? []) { ... }
```

An early crash (a *different* error, before this one) was:
`(topLevelKeys ?? []) is not iterable`. That one turned out to be real and
worth fixing: `submit/route.ts` was using whatever workflow JSON the
*browser* sent, verbatim, instead of preferring the server's
`WORKFLOW_REGISTRY` copy the way `step/route.ts` already did (doc 3 §3.4).
A browser tab that had loaded the workflow *before* the JSON schema changed
from `Record<string,string>` to `string[]` was still sending the old
object-shaped `graphql_variables` — which isn't iterable with `for...of`.

**This was a real, worth-fixing bug** (see the "Always prefer the server's
current workflow definition" comment added to `submit/route.ts`), but fixing
it and retrying — even in a **brand-new** chat session — reproduced the
*exact same* `userId` error. So this wasn't the (whole) explanation either.
Good lesson: fixing a real bug you found along the way doesn't mean you've
fixed *the* bug you're chasing. Keep going.

## Getting real evidence instead of guessing further

At this point, enough theories had failed that it was time to stop reading
code and start looking at what the code actually does at runtime. Two
temporary `console.log` lines were added:

```ts
// submit/route.ts, right after parsing the request body
console.log("[submit-debug] raw sessionContext from client:", sessionContext);

// right before the GraphQL call
console.log("[submit-debug] payload from Zod:", payload);
```

The next attempt's server log was the turning point:

```
[submit-debug] raw sessionContext from client: {
  user_id: 'Zq4kUj2fCCbEl0g1WfCXyOYEG8bGzrpK',   // ← present! and correct!
  org_id: 'f5ea33b0-...',
  formData: '{"target_user_id":"", "gender":"male", ...}'   // ← wait, what's this field?
}

[submit-debug] payload from Zod: {
  user_id: undefined,   // ← gone, after Zod
  org_id: 'f5ea33b0-...',
  gender: 'male',
  ...
}
```

Two facts, side by side, that immediately locate the bug:

1. `user_id` **was** present, correctly, in the raw request from the
   client. So every theory blaming the client, the session, or the
   camelCase converter was wrong — the value never even got that far.
2. The raw `formData` contained a field called `target_user_id` — a field
   that doesn't exist on the plain "Create Patient" form at all. It only
   exists on the **admin** variant's form (see
   [04-validation-and-security.md](./04-validation-and-security.md) §4.1).

That second fact reframes the whole investigation: this wasn't a bug in the
plain `create_patient` workflow at all — it was the **admin** workflow
(`admin_create_patient`), being tested with the "Target User ID" field left
blank.

## The actual root cause

`admin_patient_create_schema.ts`'s Zod transform does exactly this, by
design (its own doc comment says so):

```ts
export const adminPatientCreateSchema = z.object({
  target_user_id: z.string().optional(),   // ← the bug: this should not be optional
  // ...
}).transform((d) => ({
  user_id: d.target_user_id,   // always overwrite user_id with target_user_id — no fallback
  // ...
}));
```

`target_user_id: ""` (blank in the form) → stripped by `cleanFormData`
(doc 3 §3.3) before it even reaches Zod → `d.target_user_id` is
`undefined` inside the transform → `user_id: undefined` in the validated
output → `buildGraphQLVariables` correctly, deliberately skips `undefined`
values (doc 5 §5.4, "why skip `undefined` explicitly") → `userId` never
makes it into the GraphQL `input` object → fhir-gql rejects the request
because its schema says `userId: String!` (non-null, required).

**Every single layer behaved correctly.** The bug wasn't in the GraphQL
code, the case converter, or the registry fix — it was that a required
field (`target_user_id`) was declared optional in Zod, so the system let an
incomplete form through instead of stopping the user at the form with a
clear message.

## The fix

One line:

```ts
// before
target_user_id: z.string().optional(),

// after
target_user_id: z.string().min(1, "Target user is required"),
```

Now, submitting the admin form with a blank Target User ID fails
*immediately*, client-visibly, with `"Target user is required"` — a `422`
from Zod, before any network call to fhir-gql happens at all. The
confusing, deep GraphQL error can no longer occur for this reason.

## Lessons worth keeping

1. **Read the evidence literally before building a theory.** The
   "orgId present, userId absent" detail alone should have been the first
   clue, not something to explain away with a broader "the whole converter
   must be broken" theory.
2. **A fix can be correct and still not be *the* fix.** The stale-registry
   bug in `submit/route.ts` was real and worth keeping — but confirming it
   didn't change the outcome of the next test told us there was a second,
   independent bug still to find.
3. **When static reading stalls, get runtime ground truth.** Two
   `console.log` lines, in the right two places, turned an increasingly
   speculative back-and-forth into a five-second diagnosis. Don't be
   precious about "figuring it out by reading" once you've spent real
   effort doing exactly that without success.
4. **A confusing error far downstream is often a validation gap far
   upstream.** The GraphQL server's error message was technically accurate
   (`userId` really was missing) but unhelpful for a human — the *real*
   problem (an admin left a required field blank) was two layers earlier,
   at the Zod schema. Moving the check earlier didn't just fix the bug, it
   made the *next* occurrence of the same mistake self-explanatory.
