# 4. Validation and Security

Two separate concerns live here, and it's worth keeping them mentally
separate:

1. **Validation** — is this *data* well-formed? (a date looks like a date,
   a required field isn't blank, etc.)
2. **Authorization** — is this *user* allowed to do this at all?

Both are enforced **on the server**, every single request, regardless of
what the browser sent — because a browser request can always be forged
(someone could open dev tools and POST directly to `/api/workflow/submit`
with any body they like).

## 4.1 Validation — Zod schemas

Location: `src/modules/client/ai-hub/schemas/validation/`

Every workflow action can declare a `validation_schema` by name:

```json
{ "actions": [{ "validation_schema": "patient_create_schema", "...": "..." }] }
```

That name is looked up in one big registry:

```ts
// schemas/validation/index.ts
export const VALIDATION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  patient_create_schema: patientCreateSchema,
  admin_patient_create_schema: adminPatientCreateSchema,
  name_create_schema: nameCreateSchema,
  // ...~60 total, one per FHIR sub-resource form across the whole app
};
```

`submit/route.ts` does the lookup and validation right before sending
anything anywhere:

```ts
const schema = VALIDATION_SCHEMAS[action.validation_schema];
const result = schema.safeParse({ ...sessionContext, ...cleaned });
if (!result.success) {
  return Response.json({ success: false, error: /* readable Zod message */ }, { status: 422 });
}
const payload = result.data;
```

A schema is a plain [Zod](https://zod.dev) object. Here's the real one for
step 1 of Create Patient:

```ts
// patient_create_schema.ts
export const patientCreateSchema = z.object({
  user_id: z.string().optional(),   // seeded from the session, not typed by the user
  org_id: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  active: z.boolean().optional(),
  // ...
});
```

Notice `{ ...sessionContext, ...cleaned }` above — the form's own submitted
fields (`cleaned`) are merged **on top of** the accumulated session context
before validation. This is how a field like `user_id` (never shown in the
form, silently carried along in `sessionContext` since the workflow started)
ends up validated and passed through, without the user ever seeing an input
for it.

### Schemas can transform data, not just check it

Zod schemas aren't limited to pass/fail — `.transform()` can *reshape* the
validated data on the way out. The admin variant of patient creation uses
this to redirect one field into another:

```ts
// admin_patient_create_schema.ts
export const adminPatientCreateSchema = z.object({
  target_user_id: z.string().min(1, "Target user is required"),
  org_id: z.string().optional(),
  gender: z.enum([...]).optional(),
  // ...
}).transform((d) => ({
  user_id: d.target_user_id,   // <-- the important line
  org_id: d.org_id,
  gender: d.gender,
  // ...
}));
```

The admin's "Create Patient" screen lets an admin type in *someone else's*
user ID (so the new Patient record belongs to that user, not the admin).
`target_user_id` is what the admin types; `user_id` is what every
downstream consumer (REST body / GraphQL variable) actually expects. The
transform is the one place that translation happens — everything after this
point in the pipeline only ever sees `user_id`.

This exact field is the subject of the debugging story in
[07-debugging-case-study.md](./07-debugging-case-study.md) — worth reading
once you understand this transform, since the bug was really just "this
field was `.optional()` when it should have been required."

## 4.2 Authorization — sessions, JWTs, and permissions

Three layers, applied in this order on every single one of the three
routes:

### Layer 1 — is anyone logged in at all?

```ts
const authSession = await getServerSession();
if (!authSession?.user) {
  return Response.json({ type: "error", message: "Unauthorized" }, { status: 401 });
}
```

`getServerSession()` (in `src/modules/server/auth/get-session.ts`) forwards
the browser's session cookie to Better Auth's `/api/auth/get-session`
endpoint and returns the decoded session — or `null`.

### Layer 2 — does this user hold the permissions this workflow requires?

Every workflow JSON can declare `"required_permissions": ["patient:create"]`.
`checkWorkflowPermission` (`src/modules/server/shared/auth/checkWorkflowPermission.ts`)
is a small, pure function — no I/O, just set comparison:

```ts
export function checkWorkflowPermission(session: AuthResponse, workflow: WorkflowDefinition) {
  const required = workflow.required_permissions ?? [];
  if (required.length === 0) return { allowed: true, missing: [] };

  const userPermissions = new Set(session.session.permissions);
  const missing = required.filter((p) => !userPermissions.has(p));
  return { allowed: missing.length === 0, missing };
}
```

This check is repeated on **every** route (start, step, submit) — not just
once at the start — specifically because the client re-sends the whole
workflow JSON on every call. A forged request could claim to be running any
workflow it likes; re-checking permissions server-side on every hop closes
that gap.

### Layer 3 — a fresh JWT for every backend call

The workflow engine never talks to the FHIR backend with the browser's own
session cookie. Instead, it exchanges that cookie for a short-lived JWT,
fresh, on every request:

```ts
// jwt-token.ts
export async function getAuthToken(): Promise<string> {
  const cookie = hdrs.get("cookie") ?? "";
  const res = await fetch(`${process.env.BETTER_AUTH_URL}/api/auth/token`, {
    headers: { cookie },
  });
  const { token } = await res.json();
  return token;
}
```

That token is attached as `Authorization: Bearer <token>` on *every* REST
`fetch()` and every GraphQL request — the FHIR backend (whether REST or
GraphQL, see doc 5) decodes this same JWT to know who's calling and
re-derives permissions on its own side too (defense in depth: the frontend
checks permissions, and the backend checks them again independently).

---

Next: [05-rest-vs-graphql-transport.md](./05-rest-vs-graphql-transport.md)
— everything above works identically whether an action calls REST or
GraphQL. This next doc is the actual GraphQL migration work: why it exists,
how the two transports coexist in one JSON file, and the automatic
camelCase conversion layer.
