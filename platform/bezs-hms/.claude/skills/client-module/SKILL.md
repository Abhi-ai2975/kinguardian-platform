---
name: client-module
description: "Scaffold a fully-featured client module for a new resource screen — TanStack Query, Zustand store, modal-owns-form pattern, data table, column definitions, modals, and forms. Use after /server-module has been run for the same resource."
trigger: /client-module
---

# /client-module

Scaffold a complete client module for a resource screen following the organization module pattern.

## Usage

```
/client-module <app> <section> <resource>
```

Examples:
- `/client-module telemedicine admin appointment`
- `/client-module telemedicine admin encounter`

`<app>` = top-level app area (e.g. `telemedicine`)
`<section>` = section within the app (e.g. `admin`)
`<resource>` = singular resource name (e.g. `appointment`)

---

## Architecture

```
Page (Server Component — SSR first page)
  → <Resource>ModalProvider (client singleton — mounts all modals once)
  → <Resource>Table (client — TanStack Query + useServerDataTable)
      ├── TanStack Query (keepPreviousData pagination)
      ├── DataTable + DataTableGridView
      ├── DataTableToolbar (search + export + view toggle + New button)
      └── DataTableSelectionBar (bulk actions)
          └── Modal opened via Zustand <section> store
              ├── Create<Resource>Modal (owns useForm + FormProvider + useServerAction)
              │     └── Create<Resource>Form (dumb shell — useFormContext)
              ├── Edit<Resource>Modal   (owns useForm + FormProvider + useServerAction)
              │     └── Edit<Resource>Form   (dumb shell — useFormContext)
              └── Delete<Resource>Modal (AlertDialog — owns useServerAction, no form)
```

---

## File Structure

```
src/
├── app/[locale]/(apps)/<app>/<section>/<resource>/
│   └── page.tsx                         ← Server Component, SSR initial data
│
└── modules/client/<app>/<section>/
    ├── components/<resource>/
    │   ├── <Resource>Table.tsx           ← TanStack Query + useServerDataTable
    │   ├── <Resource>TableColumn.tsx     ← ColumnDef array + row actions
    │   ├── <Resource>Card.tsx            ← Grid view card (optional)
    │   └── <Resource>DetailPanel.tsx     ← Expand row panel (optional)
    ├── forms/<resource>/
    │   ├── Create<Resource>Form.tsx      ← dumb shell, useFormContext
    │   └── Edit<Resource>Form.tsx        ← dumb shell, useFormContext
    ├── modals/<resource>/
    │   ├── Create<Resource>Modal.tsx     ← owns useForm + useServerAction
    │   ├── Edit<Resource>Modal.tsx       ← owns useForm + useServerAction
    │   └── Delete<Resource>Modal.tsx     ← owns useServerAction, AlertDialog
    ├── provider/
    │   └── <Resource>ModalProvider.tsx   ← mounts all modals once, SSR guard
    ├── queries/
    │   └── <resource>.queries.ts         ← query keys + fetcher function
    ├── stores/
    │   └── <section>.store.ts            ← Zustand store (add or create)
    └── types/
        └── <resource>.type.ts            ← prop interfaces + re-exported entity types
```

---

## Step 1 — Entities: add form schemas

The schema folder is always split into multiple files (see `/server-module` rule). Form schemas live in their own file:

**Write to `entities/schemas/<resource>/forms.ts`** (create if it doesn't exist, never append to other schema files):

```typescript
import { z } from "zod";

/**
 * Flat form schema for the "Create <Resource>" modal.
 * Simpler than the validation schema — the modal maps these to the nested API payload.
 */
export const Create<Resource>FormSchema = z.object({
  // flat fields that the UI collects
});
export type TCreate<Resource>FormSchema = z.infer<typeof Create<Resource>FormSchema>;

/**
 * Flat form schema for the "Edit <Resource>" modal.
 * Only the patchable scalar fields.
 */
export const Edit<Resource>FormSchema = z.object({
  // patchable fields only
});
export type TEdit<Resource>FormSchema = z.infer<typeof Edit<Resource>FormSchema>;
```

Then ensure `entities/schemas/<resource>/index.ts` barrel includes `export * from "./forms";` (add it if missing).

---

## Step 2 — Types

```typescript
// types/<resource>.type.ts
import { T<Resource>Response, TPaginated<Resource>Response } from "@/modules/entities/schemas/<resource>";

export type T<Resource> = T<Resource>Response;

export interface I<Resource>TableProps {
  /** Server-fetched first page — hydrates the table cache on mount. */
  initialData: TPaginated<Resource>Response;
}
```

---

## Step 3 — Zustand store

If the section already has a store (`stores/<section>.store.ts`), **add** the new resource types to it. If the store doesn't exist yet, create it.

```typescript
// stores/<section>.store.ts
import { create } from "zustand";
import { T<Resource>Response } from "@/modules/entities/schemas/<resource>";

/** All modal identifiers for the <section> section. */
export type ModalType =
  | "create<Resource>"
  | "edit<Resource>"
  | "delete<Resource>";

/** Data bag — each modal reads only what it needs. */
export interface ModalData {
  <resource>Id?: number;
  <resource>Name?: string;
  <resource>?: T<Resource>Response; // full record for edit pre-population
}

interface I<Section>Store {
  type: ModalType | null;
  isOpen: boolean;
  data: ModalData | null;
  onOpen: (props: { type: ModalType; data?: ModalData }) => void;
  onClose: () => void;
}

const _use<Section>Store = create<I<Section>Store>((set) => ({
  type: null, isOpen: false, data: null,
  onOpen: ({ type, data }) => set({ isOpen: true, type, data: data ?? null }),
  onClose: () => set({ type: null, isOpen: false, data: null }),
}));

/** Hook — use inside React components. */
export const use<Section>Store = _use<Section>Store;

/** Direct accessor — use outside React (e.g. column definitions). */
export const <section>Store = _use<Section>Store;
```

---

## Step 4 — Query keys + fetcher

```typescript
// queries/<resource>.queries.ts
import { TPaginated<Resource>Response } from "@/modules/entities/schemas/<resource>";
import { list<Resource>sAction } from "@/modules/server/presentation/actions/<resource>/<resource>.actions";

export const <resource>Keys = {
  all: ["<resource>s"] as const,
  lists: () => [...<resource>Keys.all, "list"] as const,
  list: (params: { pageIndex: number; pageSize: number }) =>
    [...<resource>Keys.lists(), params] as const,
};

/**
 * Fetches one page via the server action.
 * @throws Error with the action's message on failure.
 */
export async function fetch<Resource>s(params: {
  pageIndex: number;
  pageSize: number;
}): Promise<TPaginated<Resource>Response> {
  const [data, err] = await list<Resource>sAction({
    payload: { limit: params.pageSize, offset: params.pageIndex * params.pageSize },
  });
  if (err) throw new Error(err.message ?? "Failed to load <resource>s");
  return data!;
}
```

---

## Step 5 — Column definitions

```typescript
// components/<resource>/<Resource>TableColumn.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader, DataTableExpandButton, DataTableRowActions, type RowAction }
  from "@/modules/client/shared/components/tables";
import { T<Resource>Response } from "@/modules/entities/schemas/<resource>";
import { <section>Store } from "../../stores/<section>.store";

export const <RESOURCE>_ROW_ACTIONS: RowAction<T<Resource>Response>[] = [
  {
    label: "Edit", icon: Pencil,
    onClick: (row) => <section>Store.getState().onOpen({
      type: "edit<Resource>",
      data: { <resource>: row.original, <resource>Id: row.original.id },
    }),
  },
  {
    label: "Delete", icon: Trash2, destructive: true, separator: true,
    onClick: (row) => <section>Store.getState().onOpen({
      type: "delete<Resource>",
      data: { <resource>Id: row.original.id, <resource>Name: row.original.name },
    }),
  },
];

export const <RESOURCE>_COLUMNS: ColumnDef<T<Resource>Response>[] = [
  // Select column
  {
    id: "select",
    header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label="Select all" />,
    cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="Select row" />,
    enableSorting: false, enableHiding: false, enableResizing: false, size: 40,
    meta: { exportable: false },
  },
  // Expand column (omit if no detail panel)
  {
    id: "expand",
    header: () => null,
    cell: ({ row }) => <DataTableExpandButton row={row} />,
    enableSorting: false, enableHiding: false, enableResizing: false, size: 40,
    meta: { exportable: false },
  },
  // Data columns — add resource-specific columns here
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name") ?? "—"}</span>,
    enableSorting: true, enableColumnFilter: true,
    meta: { label: "Name", variant: "text", placeholder: "Search by name…" },
  },
  // Actions column (always last, pinned right)
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <DataTableRowActions row={row} actions={<RESOURCE>_ROW_ACTIONS} />,
    enableSorting: false, enableHiding: false, enableResizing: false, size: 60,
    meta: { exportable: false },
  },
];
```

---

## Step 6 — Table component

```typescript
// components/<resource>/<Resource>Table.tsx
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableExportButton, DataTableGridSkeleton, DataTableGridView,
  DataTablePagination, DataTableSelectionBar, DataTableToolbar, DataTableViewToggle,
  useServerDataTable, type TableViewMode } from "@/modules/client/shared/components/tables";
import { T<Resource>Response } from "@/modules/entities/schemas/<resource>";
import { use<Section>Store } from "../../stores/<section>.store";
import { <RESOURCE>_COLUMNS } from "./<Resource>TableColumn";
import { <resource>Keys, fetch<Resource>s } from "../../queries/<resource>.queries";
import { I<Resource>TableProps } from "../../types/<resource>.type";

const INITIAL_PAGE_SIZE = 20;

export function <Resource>Table({ initialData }: I<Resource>TableProps) {
  const [rows, setRows] = useState<T<Resource>Response[]>(initialData.data);
  const [pageCount, setPageCount] = useState(Math.ceil(initialData.total / INITIAL_PAGE_SIZE));
  const [view, setView] = useState<TableViewMode>("table");
  const openModal = use<Section>Store((s) => s.onOpen);

  const { table, state } = useServerDataTable<T<Resource>Response>({
    columns: <RESOURCE>_COLUMNS,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    enableColumnResizing: false,
    initialColumnPinning: { left: ["select", "expand", "name"], right: ["actions"] },
    getRowCanExpand: () => true, // remove if no detail panel
  });

  const { data, isFetching } = useQuery({
    queryKey: <resource>Keys.list(state.pagination),
    queryFn: () => fetch<Resource>s(state.pagination),
    placeholderData: keepPreviousData,
    initialData,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) {
      setRows(data.data);
      setPageCount(Math.ceil(data.total / state.pagination.pageSize));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const clearFilters = useCallback(() => table.resetColumnFilters(), [table]);

  const toolbar = (
    <DataTableToolbar table={table}>
      <DataTableExportButton table={table} filename="<resource>s" title="<Resource>s Export" />
      <DataTableViewToggle view={view} onViewChange={setView} />
      <Button size="default" onClick={() => openModal({ type: "create<Resource>" })}>
        <Plus className="mr-2 h-4 w-4" /> New <Resource>
      </Button>
    </DataTableToolbar>
  );

  const actionBar = (
    <DataTableSelectionBar table={table}>
      <Button variant="destructive" size="sm">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete ({table.getFilteredSelectedRowModel().rows.length})
      </Button>
    </DataTableSelectionBar>
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-16">
      <p className="text-sm font-medium">No <resource>s found</p>
      <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-2.5">
      {toolbar}
      {view === "table" ? (
        <DataTable table={table} emptyState={emptyState} loading={isFetching}
          loadingRowCount={state.pagination.pageSize} rowHeight="medium"
          pageSizeOptions={[10, 20, 50, 100]} actionBar={actionBar}
          renderSubComponent={(row) => <div>{/* <Resource>DetailPanel row={row} */}</div>}
        />
      ) : (
        <>
          {isFetching
            ? <DataTableGridSkeleton cardCount={state.pagination.pageSize} gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
            : <DataTableGridView table={table} renderCard={(row) => <div>{/* <Resource>Card row={row} */}</div>} gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
          }
          <div className="flex flex-col gap-2.5">
            <DataTablePagination table={table} pageSizeOptions={[10, 20, 50, 100]} />
            {table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Step 7 — Modals (modal-owns-form pattern)

### Create modal

```typescript
// modals/<resource>/Create<Resource>Modal.tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Create<Resource>FormSchema, type TCreate<Resource>FormSchema }
  from "@/modules/entities/schemas/<resource>";
import { create<Resource>Action } from "@/modules/server/presentation/actions/<resource>/<resource>.actions";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { use<Section>Store } from "../../stores/<section>.store";
import { <resource>Keys } from "../../queries/<resource>.queries";
import { Create<Resource>Form } from "../../forms/<resource>/Create<Resource>Form";

export function Create<Resource>Modal() {
  const isOpen  = use<Section>Store((s) => s.isOpen);
  const type    = use<Section>Store((s) => s.type);
  const onClose = use<Section>Store((s) => s.onClose);
  const queryClient = useQueryClient();
  const open = isOpen && type === "create<Resource>";

  const form = useForm<TCreate<Resource>FormSchema>({
    resolver: zodResolver(Create<Resource>FormSchema),
    defaultValues: { /* sensible defaults */ },
  });

  const { execute, isPending } = useServerAction(create<Resource>Action, {
    onSuccess: () => {
      toast.success("<Resource> created successfully");
      void queryClient.invalidateQueries({ queryKey: <resource>Keys.all });
      form.reset();
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, form, fallbackMessage: "Failed to create <resource>" });
    },
  });

  async function handleSubmit(values: TCreate<Resource>FormSchema) {
    // Map flat form values → nested API payload here
    await execute({
      payload: { /* ... mapped from values */ },
      transportOptions: { shouldRevalidate: true, url: "/<app>/<section>/<resource>s" },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New <Resource></DialogTitle>
          <DialogDescription>Create a new <resource>.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <Create<Resource>Form onSubmit={handleSubmit} onCancel={onClose} isPending={isPending} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
```

### Edit modal

Same structure as Create modal plus:
- Read `data.<resource>` from the store
- `useEffect` to reset form when a different record opens (prevents stale values):
```typescript
useEffect(() => {
  if (data?.<resource>) {
    form.reset({ /* map record fields to flat form values */ });
  }
}, [data?.<resource>?.id]); // reset when id changes, not on every re-render
```

### Delete modal

```typescript
// modals/<resource>/Delete<Resource>Modal.tsx
"use client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle }
  from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { delete<Resource>Action } from "@/modules/server/presentation/actions/<resource>/<resource>.actions";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { use<Section>Store } from "../../stores/<section>.store";
import { <resource>Keys } from "../../queries/<resource>.queries";

export function Delete<Resource>Modal() {
  const isOpen  = use<Section>Store((s) => s.isOpen);
  const type    = use<Section>Store((s) => s.type);
  const data    = use<Section>Store((s) => s.data);
  const onClose = use<Section>Store((s) => s.onClose);
  const queryClient = useQueryClient();
  const open = isOpen && type === "delete<Resource>";

  const { execute, isPending } = useServerAction(delete<Resource>Action, {
    onSuccess: () => {
      toast.success(`"${data?.<resource>Name ?? "<Resource>"}" deleted`);
      void queryClient.invalidateQueries({ queryKey: <resource>Keys.all });
      onClose();
    },
    onError: ({ err }) => handleZSAError({ err, fallbackMessage: "Failed to delete <resource>" }),
  });

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete <Resource></AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{data?.<resource>Name ?? "this <resource>"}</strong>? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!data?.<resource>Id) return;
              await execute({ payload: { id: data.<resource>Id! },
                transportOptions: { shouldRevalidate: true, url: "/<app>/<section>/<resource>s" } });
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Step 8 — Form shells (dumb — useFormContext)

```typescript
// forms/<resource>/Create<Resource>Form.tsx
"use client";
import { useFormContext } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormInput, FormSelect, FormSwitch }
  from "@/modules/client/shared/components/CustomFormFields";
import type { TCreate<Resource>FormSchema }
  from "@/modules/entities/schemas/<resource>";

interface Create<Resource>FormProps {
  onSubmit: (values: TCreate<Resource>FormSchema) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  children?: React.ReactNode; // SelectItem list injected by modal
}

export function Create<Resource>Form({ onSubmit, onCancel, isPending, children }: Create<Resource>FormProps) {
  const form = useFormContext<TCreate<Resource>FormSchema>();
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Add FormInput / FormSelect / FormSwitch fields here */}
      <FormInput control={form.control} name="name" label="Name *" placeholder="..." />

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create <Resource>
        </Button>
      </DialogFooter>
    </form>
  );
}
```

Available form field components (all from `@/modules/client/shared/components/CustomFormFields`):
- `FormInput` — text, email, tel, number inputs
- `FormSelect` — dropdown with `children` as `<SelectItem>` elements
- `FormSwitch` — boolean toggle with label + optional description
- `FormTextarea` — multiline text
- `FormCheckbox` — single checkbox
- `FormSlider` — numeric range slider
- `FormRadioGroup` — radio button group

---

## Step 9 — Modal provider

```typescript
// provider/<Resource>ModalProvider.tsx
"use client";
import { useEffect, useState } from "react";
import { Create<Resource>Modal } from "../modals/<resource>/Create<Resource>Modal";
import { Edit<Resource>Modal }   from "../modals/<resource>/Edit<Resource>Modal";
import { Delete<Resource>Modal } from "../modals/<resource>/Delete<Resource>Modal";

export function <Resource>ModalProvider() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;
  return (
    <>
      <Create<Resource>Modal />
      <Edit<Resource>Modal />
      <Delete<Resource>Modal />
    </>
  );
}
```

---

## Step 10 — Page (Server Component)

```typescript
// app/[locale]/(apps)/<app>/<section>/<resource>s/page.tsx
import { list<Resource>sAction } from "@/modules/server/presentation/actions/<resource>/<resource>.actions";
import { <Resource>Table } from "@/modules/client/<app>/<section>/components/<resource>/<Resource>Table";
import { <Resource>ModalProvider } from "@/modules/client/<app>/<section>/provider/<Resource>ModalProvider";

export default async function <Resource>sPage() {
  // SSR first page — hydrates TanStack Query cache on mount, no duplicate fetch
  const [initialData, err] = await list<Resource>sAction({
    payload: { limit: 20, offset: 0 },
  });

  if (err || !initialData) {
    return <div>Failed to load <resource>s: {err?.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight"><Resource>s</h1>
      </div>
      <<Resource>ModalProvider />
      <<Resource>Table initialData={initialData} />
    </div>
  );
}
```

---

## Rules

- **File splitting**: Never write a large file that mixes multiple concerns. Split client files into focused files with sub-folders as needed; always add an `index.ts` or barrel where a folder has multiple files. If any component file would exceed ~120 lines with distinct concerns, split it. Schema form schemas always go in their own `forms.ts` file.
- **Barrel imports only**: Import from `@/modules/entities/schemas/<resource>` (the barrel), never from internal sub-files like `response.ts` or `input.ts` directly.
- **Modal owns form**: `useForm` + `FormProvider` + `useServerAction` live in the modal, not the form component
- **Form is a dumb shell**: reads via `useFormContext()`, renders layout only, no action logic
- **`handleZSAError`** on every `onError`: maps field errors → `form.setError()`, auth errors → toast
- **TanStack Query**: `keepPreviousData` + `initialData` from SSR — no duplicate first fetch
- **Circular-dependency break**: separate `rows`/`pageCount` state seeded from `initialData`, synced via `useEffect` on query `data`
- **`enableColumnResizing: false`** — TanStack defaults `columnResizeMode: 'onEnd'` internally
- **Zustand store**: use `use<Section>Store` hook in React, `<section>Store.getState()` outside (e.g. column action callbacks)
- **Modal provider SSR guard**: `isMounted` prevents hydration mismatches with Zustand
- **Edit modal `useEffect` reset**: reset form when `data.<resource>?.id` changes — not on every render
- **Comments**: file-level block + JSDoc on every exported function/component (project rule)

## Key Reference Files

| File | Purpose |
|---|---|
| `client/telemedicine/admin/components/organizations/OrganizationsTable.tsx` | Full table example |
| `client/telemedicine/admin/components/organizations/OrganizationsTableColumn.tsx` | Column definitions |
| `client/telemedicine/admin/modals/organizations/CreateOrganizationModal.tsx` | Modal-owns-form pattern |
| `client/telemedicine/admin/forms/organizations/CreateOrganizationForm.tsx` | Dumb form shell |
| `client/telemedicine/admin/modals/organizations/DeleteOrganizationModal.tsx` | AlertDialog pattern |
| `client/telemedicine/admin/stores/admin.store.ts` | Zustand store pattern |
| `client/telemedicine/admin/queries/organization.queries.ts` | Query keys + fetcher |
| `client/shared/components/CustomFormFields.tsx` | All form field components |
| `client/shared/error/handleZSAError.ts` | Unified ZSA error handler |
