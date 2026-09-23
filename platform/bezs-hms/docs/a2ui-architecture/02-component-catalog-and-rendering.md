# 2. The Component Catalog and Rendering Engine

Location in the repo: `src/modules/client/ai-hub/a2ui/`

This layer answers one question: **given a JSON node like
`{"type": "TextField", "properties": {...}}`, how does a real `<input>`
element end up on screen?**

There are four pieces working together:

```
types/index.ts        — TypeScript shape of every possible component node
rendering/catalog.ts   — maps a type name ("TextField") to a React component
rendering/renderer.tsx — the actual <Renderer> that does the lookup + render
rendering/processor.ts — shared data store + event bus for one chat surface
```

## 2.1 The component "vocabulary" — `types/index.ts`

Every node in an A2UI tree has this shape:

```ts
interface BaseComponentNode {
  id: string;
  weight?: number;
  dataContextPath?: string;
  slotName?: string;
  className?: string;
}

interface TextFieldNode extends BaseComponentNode {
  type: "TextField";
  properties: TextField; // { label?, text?, textFieldType?, placeholder?, classNames? }
}
```

`AnyComponentNode` is a big union of every node type — around 45 of them at
the time of writing (`TextNode | TextFieldNode | ButtonNode | DatePickerNode
| RepeatableGroupNode | FileUploadNode | DataTableNode | BarChartNode | ...`).
This is the entire "vocabulary" the system can render. If a node's `type`
isn't in this union (and isn't in the catalog below), it simply can't be
rendered — which is a deliberate constraint: it keeps the AI/JSON author
working within a known, tested set of widgets instead of inventing arbitrary
HTML.

Some of these types carry rich domain-specific configuration. For example
`TerminologySelectType` (used for FHIR coded fields like Gender or Marital
Status) has a `serverSearch` config that can either point at a small
value-set endpoint or do full-text search against LOINC/ICD-10/SNOMED:

```ts
export interface TerminologySelectServerSearch {
  resource?: string;   // Mode A: "Patient"
  field?: string;      // Mode A: "gender"
  system?: string;      // Mode B: "http://loinc.org"
  minChars?: number;
  debounceMs?: number;
}
```

## 2.2 The catalog — `rendering/catalog.ts`

This is a flat lookup table: component type name → real React component.

```ts
export const DEFAULT_CATALOG: Catalog = {
  Text: { component: Text },
  TextField: { component: TextField },
  Button: { component: Button },
  DatePicker: { component: DatePicker },
  RepeatableGroup: { component: RepeatableGroup },
  FileUpload: { component: FileUpload },
  DataTable: { component: DataTable },
  BarChart: { component: BarChart },
  // ...45 total
};
```

Each entry on the right (`../catalog/text.tsx`, `../catalog/button.tsx`, …)
is a normal `.tsx` file implementing one widget using regular shadcn/ui
components underneath. Adding a brand-new widget type to the whole system is
exactly two steps: write the `.tsx` component, add one line here.

## 2.3 The renderer — `rendering/renderer.tsx`

This is the actual recursive rendering function, and it is deliberately tiny:

```tsx
export function Renderer({ processor, surfaceId, component, weight = "initial" }: RendererProps) {
  const config = DEFAULT_CATALOG[component.type];

  if (!config) {
    console.warn(`Unknown component type: ${component.type}`);
    return null;
  }

  const Component = config.component;

  return (
    <Component
      processor={processor}
      surfaceId={surfaceId}
      component={component}
      weight={weight}
    />
  );
}
```

That's the whole thing. `<Renderer component={someNode} />` looks up
`someNode.type` in the catalog and hands off to that component. Container
components like `Column`/`Row`/`Form` call `<Renderer>` again for each of
their own children — that's what makes the tree recursive. A `Form`
component (see 2.5 below) literally does:

```tsx
{component.properties.children?.map((child) => (
  <Renderer key={child.id} processor={processor} surfaceId={surfaceId} component={child} />
))}
```

## 2.4 The processor — `rendering/processor.ts`

Every rendered "surface" (roughly: one chat message's worth of UI) shares one
`IMessageProcessor` instance. It has two jobs:

**Job 1 — a per-surface data store.** In "legacy push" mode (Mode B from
[01-what-is-a2ui.md](./01-what-is-a2ui.md)), a server can push
`dataModelUpdate` messages that update a live key-value store per surface,
and components read from it via `getData(node, path, surfaceId)`. In
**workflow mode** (the one actually used everywhere in this repo) this store
stays empty — all the data a component needs has already been resolved into
literal values by `mapDataToUI` (section 2.6) *before* the component ever
renders. So in practice, for every workflow you'll actually test, you can
ignore this half of the processor.

**Job 2 — the dispatch bridge.** This is the important part. Recall from
[01-what-is-a2ui.md](./01-what-is-a2ui.md) that a `Button`/`Form` doesn't
know what happens when it's clicked/submitted — it just calls
`processor.dispatch(message)`:

```ts
const dispatch = (message: A2UIClientEventMessage): Promise<ServerToClientMessage[]> => {
  return new Promise((resolve) => {
    const eventListenersForType = eventListeners["dispatch"] || [];
    eventListenersForType.forEach((listener) => {
      listener({ detail: { message, resolve } } as any);
    });
  });
};
```

This is a plain event-emitter pattern: `dispatch()` fires a DOM
`CustomEvent` named `"dispatch"` and returns a `Promise` that stays pending
until whoever's listening calls `resolve(...)`. The actual page component
(`EMRChatContainer` in this repo, via the `useEmrDispatch` hook) registers
exactly one listener:

```ts
// useEmrDispatch.ts
processor.addEventListener("dispatch", handleDispatch);
```

`handleDispatch` is where all the *real* work happens: it reads
`message.userAction.name` (e.g. `"create_patient"`), posts to
`/api/workflow/submit`, and eventually calls `resolve([])` to un-block the
`Form`'s `await sendAction(...)` call. This is exactly the separation of
concerns described in doc 1: the component layer only emits an event; a
completely separate layer (the hook) decides what the event means.

## 2.5 From click to dispatch — `catalog/form.tsx`

Tying it together, here's the actual code path for a form submission,
condensed:

```tsx
// form.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const formData = collectFormData(); // reads every <input>/<select> under this <form>

  const actionWithFormData = {
    ...component.properties.action,          // e.g. { name: "create_patient" }
    context: [
      ...(component.properties.action.context || []),
      { key: "formData", value: { literalString: JSON.stringify(formData) } },
    ],
  };
  await sendAction(actionWithFormData); // → processor.dispatch(...)
};
```

`collectFormData()` is refreshingly low-tech: it does
`formRef.current.querySelectorAll("input, textarea, select")` and reads each
element's `id` + value directly from the DOM — no React state, no form
library. Every field the JSON schema renders must have a matching HTML `id`
for this to work; that's the wire format between "what field did the user
fill in" and "what key will `formData` have."

So a `Form`'s submit button click turns into, roughly:

```
DOM submit event
  → collectFormData() reads every input by id
  → sendAction({ name: "create_patient", context: [{ key: "formData", value: {...} }] })
  → processor.dispatch({ userAction: { name: "create_patient", context: {...} } })
  → useEmrDispatch's handleDispatch fires
  → POST /api/workflow/submit  { actionName: "create_patient", formData: {...}, ... }
```

That last line is where doc 2 hands off to doc 3 — the server-side workflow
engine that actually validates this data and calls the FHIR backend.

## 2.6 Turning schema + data into literal values — `utils/mapUiSchemaDataV3.ts`

One piece we skipped: how does a UI schema JSON file, which is *static* and
generic (it doesn't know a specific patient's ID yet), become a *specific*
rendered form?

The UI schema is allowed to contain `"$variable"` placeholders anywhere a
literal value would normally go:

```json
{ "type": "Text", "properties": { "text": "$patient_name" } }
```

Before this JSON is ever handed to `<Renderer>`, it's passed through
`mapDataToUI(schema, data)` (in `mapUiSchemaDataV3.ts`), which walks the
whole tree and replaces every `$var` with a real value pulled from `data`
(which is `stepData` + `sessionContext` merged together — see doc 3):

```ts
export const mapDataToUI = (ui: any, data: AnyObject): any => {
  if (typeof ui === "string") {
    const exact = ui.match(/^\$([a-zA-Z0-9_.[\]]+(?:\s*\|\s*\w+)?)$/);
    if (exact) return resolveVariable(exact[1], data);          // "$patient_name" → "Jane Doe"
    return ui.replace(/\$([a-zA-Z0-9_.[\]]+...)/g, (_, expr) =>  // "Hi $name!" → "Hi Jane!"
      String(resolveVariable(expr, data)));
  }
  if (Array.isArray(ui)) return ui.map((item) => mapDataToUI(item, data));
  if (ui !== null && typeof ui === "object") {
    if ("$transform" in ui) { /* data-pipeline for charts/KPIs — see source */ }
    if (ui.forEach && ui.item && ui.component) { /* expands an array into N repeated nodes */ }
    // otherwise: recurse into every key of the object
  }
  return ui;
};
```

It also supports **formatters** (`$price | currency`, `$date | date`) and a
**`forEach` loop directive** that expands one template component into N
copies — e.g. rendering a list of appointment cards from an array of
appointments, without the JSON author writing the array length anywhere.

This function is called exactly once per step render (`buildUiFromData` in
`useEmrSend.ts`/`useEmrWorkflow.ts`), producing a tree of *fully resolved*
`AnyComponentNode`s with no `$...` strings left — only then does it get
handed to `<Renderer>`.

---

Next: [03-workflow-engine.md](./03-workflow-engine.md) — where the UI
schemas, the `$variable` data, and the "what does this button do" logic
actually come from: the workflow JSON files and the three server routes
that drive them.
