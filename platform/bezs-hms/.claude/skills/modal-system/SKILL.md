---
name: modal-system
description: "Scaffold the Zustand store + modals folder + modal provider for a new section or add a new modal type to an existing section. Use this when a section needs store-driven modals without the full /client-module scaffold."
trigger: /modal-system
---

# /modal-system

Scaffold or extend the three-layer modal system (Zustand store → modal components → provider) for a section.

## Usage

```
/modal-system <app> <section> [<ModalName>...]
```

Examples:
- `/modal-system telemedicine patient BookAppointment`  — create the full system with one modal
- `/modal-system telemedicine patient BookAppointment CancelAppointment` — create system with two modals
- `/modal-system telemedicine admin EditOrganization` — add a modal to an existing section store

`<app>` = top-level app area (e.g. `telemedicine`)
`<section>` = section within the app (e.g. `patient`, `admin`, `doctor`)
`<ModalName>` = one or more PascalCase modal names (e.g. `BookAppointment`, `CancelAppointment`)

---

## Architecture

```
Page (Server Component)
  └── <Section>ModalProvider (client singleton — isMounted guard)
        ├── <ModalName>Modal   ← subscribes to store, no props
        └── <ModalName2>Modal  ← subscribes to store, no props
              ↑ opened by ↑
Table / Column / Button
  └── <section>Store.getState().onOpen({ type, data })
```

---

## File Structure

```
src/modules/client/<app>/<section>/
├── stores/
│   └── <section>.store.ts           ← Zustand store (create or extend)
├── modals/
│   └── <category>/                  ← group by resource (appointments, encounters, …)
│       └── <ModalName>Modal.tsx     ← reads store, no props
└── provider/
    └── <Section>ModalProvider.tsx   ← mounts all modals once with isMounted guard
```

The provider is rendered once on the page (or layout) that hosts the components that open the modals:

```
src/app/[locale]/(apps)/<app>/<section>/<resource>s/page.tsx
  └── <Section>ModalProvider  ← add alongside the table
```

---

## Step 1 — Zustand store

**If the section already has a store**, open `stores/<section>.store.ts` and:
- Add new identifiers to `ModalType` union
- Add new data fields to `ModalData` interface

**If no store exists**, create it:

```typescript
// stores/<section>.store.ts
/**
 * <section>.store — Zustand store for telemedicine <section> modal state.
 *
 * Layer: client / <app> / <section> / stores
 *
 * Central store that tracks which modal is currently open and the data it
 * needs. Any component can call onOpen({ type, data }) — no prop drilling.
 * Pattern mirrors admin.store.ts.
 */

import { create } from "zustand";
// Import entity types needed for ModalData fields
// import { T<Resource>Response } from "@/modules/entities/schemas/<resource>";

// ── Modal type union ───────────────────────────────────────────────────────────

/** All modal identifiers for the <section> section. */
export type <Section>ModalType =
  | "<camelCaseModalName>"   // e.g. "bookAppointment", "cancelAppointment"
  | "<camelCaseModalName2>";

// ── Modal data payload ─────────────────────────────────────────────────────────

/**
 * Flat data bag passed to the store when a modal is opened.
 * Each modal reads only the fields it needs.
 */
export interface <Section>ModalData {
  // Add one optional field per modal's data requirement:
  // <resource>Id?: number;
  // <resource>?: T<Resource>Response;
  // bookHref?: string;
  // intakeHref?: string;
}

// ── Store interface ────────────────────────────────────────────────────────────

interface I<Section>Store {
  type: <Section>ModalType | null;
  isOpen: boolean;
  data: <Section>ModalData | null;
  /** Opens a modal. Pass the type and any data the modal needs to render. */
  onOpen: (props: { type: <Section>ModalType; data?: <Section>ModalData }) => void;
  /** Closes the current modal and clears all data. */
  onClose: () => void;
}

// ── Store instance ─────────────────────────────────────────────────────────────

const _use<Section>Store = create<I<Section>Store>((set) => ({
  type: null,
  isOpen: false,
  data: null,

  onOpen: ({ type, data }) =>
    set({ isOpen: true, type, data: data ?? null }),

  onClose: () =>
    set({ type: null, isOpen: false, data: null }),
}));

/**
 * Hook — use inside React components.
 * @example const openModal = use<Section>Store((s) => s.onOpen);
 */
export const use<Section>Store = _use<Section>Store;

/**
 * Direct store accessor — use outside React (e.g. in column action callbacks).
 * @example <section>Store.getState().onOpen({ type: "…", data: { … } });
 */
export const <section>Store = _use<Section>Store;
```

---

## Step 2 — Modal components

One file per modal. Each modal is **self-contained** — it subscribes to the store directly, accepts no props, and mounts once via the provider.

### Dialog modal (informational / chooser)

```typescript
// modals/<category>/<ModalName>Modal.tsx
/**
 * <ModalName>Modal — <one-line description>.
 *
 * Layer: client / <app> / <section> / modals / <category>
 *
 * Subscribes to the <section> Zustand store — no props required.
 * Mounted once inside <Section>ModalProvider.
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { use<Section>Store } from "../../stores/<section>.store";

/**
 * <ModalName> dialog.
 * Reads open state and data from the <section> Zustand store.
 */
export function <ModalName>Modal() {
  const isOpen  = use<Section>Store((s) => s.isOpen);
  const type    = use<Section>Store((s) => s.type);
  const data    = use<Section>Store((s) => s.data);
  const onClose = use<Section>Store((s) => s.onClose);

  /** Only open when this specific modal type is active. */
  const open = isOpen && type === "<camelCaseModalName>";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>…</DialogTitle>
          <DialogDescription>…</DialogDescription>
        </DialogHeader>

        {/* Modal body — read from `data` as needed */}
      </DialogContent>
    </Dialog>
  );
}
```

### Form modal (modal-owns-form pattern)

When the modal includes a form, the modal owns `useForm` + `FormProvider` + `useServerAction`. The form component is a dumb shell that reads via `useFormContext()`.

```typescript
// modals/<category>/<ModalName>Modal.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { <Resource>FormSchema, type T<Resource>FormSchema }
  from "@/modules/entities/schemas/<resource>";
import { <resource>Action } from "@/modules/server/presentation/actions/<resource>";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { use<Section>Store } from "../../stores/<section>.store";
import { <resource>Keys } from "../../queries/<resource>.queries";
import { <ModalName>Form } from "../../forms/<resource>/<ModalName>Form";

/**
 * <ModalName>Modal — owns the form instance and server action.
 * Delegates field rendering to <ModalName>Form via FormProvider.
 */
export function <ModalName>Modal() {
  const isOpen  = use<Section>Store((s) => s.isOpen);
  const type    = use<Section>Store((s) => s.type);
  const data    = use<Section>Store((s) => s.data);
  const onClose = use<Section>Store((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "<camelCaseModalName>";

  const form = useForm<T<Resource>FormSchema>({
    resolver: zodResolver(<Resource>FormSchema),
    defaultValues: { /* sensible defaults */ },
  });

  function handleClose() {
    form.reset();
    onClose();
  }

  const { execute, isPending } = useServerAction(<resource>Action, {
    onSuccess: () => {
      toast.success("…");
      void queryClient.invalidateQueries({ queryKey: <resource>Keys.all });
      handleClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "…" });
    },
  });

  async function handleSubmit(values: T<Resource>FormSchema) {
    await execute({ payload: { /* map values → API payload */ } });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>…</DialogTitle>
          <DialogDescription>…</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <ModalName>Form onSubmit={handleSubmit} onCancel={handleClose} isPending={isPending} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
```

### AlertDialog modal (destructive confirm)

```typescript
// modals/<category>/<ModalName>Modal.tsx
"use client";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { <resource>Action } from "@/modules/server/presentation/actions/<resource>";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { use<Section>Store } from "../../stores/<section>.store";
import { <resource>Keys } from "../../queries/<resource>.queries";

/**
 * <ModalName>Modal — confirmation AlertDialog for a destructive action.
 * Reads the target record name from the <section> store data.
 */
export function <ModalName>Modal() {
  const isOpen  = use<Section>Store((s) => s.isOpen);
  const type    = use<Section>Store((s) => s.type);
  const data    = use<Section>Store((s) => s.data);
  const onClose = use<Section>Store((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "<camelCaseModalName>";

  const { execute, isPending } = useServerAction(<resource>Action, {
    onSuccess: () => {
      toast.success("…");
      void queryClient.invalidateQueries({ queryKey: <resource>Keys.all });
      onClose();
    },
    onError: ({ err }) => handleZSAError({ err, fallbackMessage: "…" }),
  });

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>…</AlertDialogTitle>
          <AlertDialogDescription>
            {/* Use data fields to describe the target: */}
            {/* Are you sure you want to delete <strong>{data?.resourceName}</strong>? */}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!data?.<resource>Id) return;
              await execute({ payload: { id: data.<resource>Id } });
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Step 3 — Modal provider

```typescript
// provider/<Section>ModalProvider.tsx
/**
 * <Section>ModalProvider — mounts all <section>-section modals once.
 *
 * Layer: client / <app> / <section> / provider
 *
 * Pattern mirrors OrganizationModalProvider. The isMounted guard prevents
 * hydration mismatches — the Zustand <section> store relies on browser APIs
 * and must not hydrate on the server.
 *
 * Usage: render <<Section>ModalProvider /> once per page/layout that hosts
 * <section> UI. Modals are controlled by the <section> store — no props.
 */

"use client";

import { useEffect, useState } from "react";
import { <ModalName>Modal } from "../modals/<category>/<ModalName>Modal";
// import { <ModalName2>Modal } from "../modals/<category>/<ModalName2>Modal";

/**
 * Renders all <section> modals as client-only singletons.
 * The isMounted guard prevents Zustand hydration mismatches on SSR pages.
 */
export function <Section>ModalProvider() {
  /**
   * Deferred mount: skip rendering on the first server-rendered pass.
   * Without this guard Zustand's browser-only store mismatches the server HTML.
   */
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <<ModalName>Modal />
      {/* <<ModalName2>Modal /> */}
    </>
  );
}
```

---

## Step 4 — Open a modal from a component

### Inside a React component (hook)

```typescript
import { use<Section>Store } from "@/modules/client/<app>/<section>/stores/<section>.store";

// In the component:
const openModal = use<Section>Store((s) => s.onOpen);

<Button onClick={() => openModal({ type: "<camelCaseModalName>", data: { bookHref, intakeHref } })}>
  Open Modal
</Button>
```

### Outside React (column action callbacks, event handlers)

```typescript
import { <section>Store } from "@/modules/client/<app>/<section>/stores/<section>.store";

// In a ColumnDef cell or standalone callback:
<section>Store.getState().onOpen({
  type: "<camelCaseModalName>",
  data: { <resource>Id: row.original.id },
});
```

---

## Step 5 — Wire the provider into the page

Add `<Section>ModalProvider` to the page (or shared layout) that contains the components that open modals:

```typescript
// app/[locale]/(apps)/<app>/<section>/<resource>s/page.tsx
import { <Section>ModalProvider } from "@/modules/client/<app>/<section>/provider/<Section>ModalProvider";

export default async function Page() {
  // ...SSR data fetching...
  return (
    <div>
      <h1>…</h1>
      <ResourceTable initialData={initialData} />

      {/* Modal singletons — controlled by <section> Zustand store */}
      <<Section>ModalProvider />
    </div>
  );
}
```

---

## Rules

- **One modal per type key**: the `type` field in the store uniquely identifies which modal is open. A modal renders only when `isOpen && type === "itsOwnType"`.
- **No props on modals**: modals subscribe to the store directly. All data flows through `ModalData`. No `open`/`onClose`/`data` props.
- **Store vs hook accessor**: use `use<Section>Store` (hook) inside React components; use `<section>Store.getState()` outside React (column defs, event callbacks).
- **isMounted guard in provider**: always required — prevents Zustand client-only state from causing SSR hydration mismatches.
- **Provider placed on the page, not in the table**: the provider is a sibling of the table component, not a wrapper around it. This matches the admin pattern (`OrganizationModalProvider` on the organizations page).
- **Extend, don't recreate**: if `stores/<section>.store.ts` already exists, add new `ModalType` identifiers and `ModalData` fields — never create a second store for the same section.
- **Group modals by resource**: `modals/appointments/`, `modals/encounters/` — mirrors the admin `modals/organizations/` pattern.
- **Comments**: file-level block + JSDoc on every exported function/component (project rule).

---

## Key Reference Files

| File | Purpose |
|---|---|
| `client/telemedicine/patient/stores/patient.store.ts` | Patient section store |
| `client/telemedicine/patient/modals/appointments/BookAppointmentModal.tsx` | Chooser dialog example |
| `client/telemedicine/patient/provider/PatientModalProvider.tsx` | Provider with isMounted guard |
| `client/telemedicine/admin/stores/admin.store.ts` | Admin store (multi-resource example) |
| `client/telemedicine/admin/modals/organizations/CreateOrganizationModal.tsx` | Form modal example |
| `client/telemedicine/admin/modals/organizations/DeleteOrganizationModal.tsx` | AlertDialog example |
| `client/telemedicine/admin/provider/OrganizationModalProvider.tsx` | Provider pattern reference |
