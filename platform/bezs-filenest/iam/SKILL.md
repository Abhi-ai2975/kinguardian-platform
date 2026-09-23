# SKILL.md — Clean Architecture Implementation Guide

Reference implementations: **Users** and **OAuth Clients** modules. Follow every step in order.

---

## Overview: What Gets Created Per Feature

```
entities/schemas/admin/<feature>/<feature>.schema.ts        ← ALL Zod schemas
entities/types/admin/<feature>.type.ts                       ← TS payload types (optional)

server/core/admin/
  domain/interfaces/<feature>.service.interface.ts           ← Interface (contract)
  infrastructure/services/<feature>.service.ts               ← Better Auth calls
  application/usecases/<feature>/<op>.usecase.ts             ← One file per operation
  application/usecases/<feature>/index.ts
  interface-adapters/controllers/<feature>/<op>.controller.ts
  interface-adapters/controllers/<feature>/index.ts

server/di/modules/admin/<feature>.module.ts                  ← DI binding
server/di/types.ts                                           ← (updated)
server/di/modules/index.ts                                   ← (updated)
server/di/container.ts                                       ← (updated)

server/presentation/actions/admin/<feature>.action.ts        ← ZSA actions
server/presentation/actions/admin/index.ts                   ← (updated)

client/admin/types/<feature>.type.ts                         ← Component prop types
client/admin/components/<feature>/<Feature>Table.tsx
client/admin/components/<feature>/<Feature>TableColumn.tsx
client/admin/forms/<feature>/<Op>Form.tsx                    ← One per modal with a form
client/admin/modals/<feature>/<Op>Modal.tsx                  ← One per operation
client/admin/provider/<Feature>ModalProvider.tsx
client/admin/stores/admin.store.ts                           ← (updated: ModalType, ModalData)

app/[locale]/admin/<feature>/page.tsx
app/[locale]/admin/<feature>/layout.tsx
```

---

## Step 1 — Entities: Zod Schemas

**Path:** `src/modules/entities/schemas/admin/<feature>/<feature>.schema.ts`

All schemas for a feature live in one file. Define in this order:

```typescript
import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ---------------------------------------------------------- //
// Base / DTO schemas (shape of Better Auth API responses)
// ---------------------------------------------------------- //

export const <Feature>Schema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),   // ALWAYS z.coerce.date() for dates — Better Auth sends strings
  updatedAt: z.coerce.date(),
  someField: z.string().nullable().optional(),
});

export type T<Feature>Schema = z.infer<typeof <Feature>Schema>;

export const Get<Feature>sResponseDtoSchema = z.object({
  <feature>s: z.array(<Feature>Schema),
  total: z.number(),
});
export type TGet<Feature>sResponseDtoSchema = z.infer<typeof Get<Feature>sResponseDtoSchema>;

// ---------------------------------------------------------- //
// Create <Feature>
// ---------------------------------------------------------- //

// FormSchema = what the React Hook Form receives (may include UI-only fields)
export const Create<Feature>FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // UI-only fields like confirmPassword go here, NOT in ValidationSchema
});
export type TCreate<Feature>FormSchema = z.infer<typeof Create<Feature>FormSchema>;

// ValidationSchema = what the controller validates (stripped of UI-only fields)
export const Create<Feature>ValidationSchema = z.object({
  name: z.string().min(1),
});
export type TCreate<Feature>ValidationSchema = z.infer<typeof Create<Feature>ValidationSchema>;

// ActionSchema = ZSA input wrapper (payload + transport options)
export const Create<Feature>ActionSchema = z.object({
  payload: Create<Feature>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreate<Feature>ActionSchema = z.infer<typeof Create<Feature>ActionSchema>;

// ---------------------------------------------------------- //
// Update <Feature>
// ---------------------------------------------------------- //

export const Update<Feature>ValidationSchema = z.object({
  id: z.string(),
  data: z.object({
    name: z.string().min(1).optional(),
  }),
});
export type TUpdate<Feature>ValidationSchema = z.infer<typeof Update<Feature>ValidationSchema>;

export const Update<Feature>ActionSchema = z.object({
  payload: Update<Feature>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdate<Feature>ActionSchema = z.infer<typeof Update<Feature>ActionSchema>;

// ---------------------------------------------------------- //
// Delete <Feature>
// ---------------------------------------------------------- //

// Do NOT reuse a shared "IdSchema" that includes extra fields — only include what the API needs
export const Delete<Feature>ValidationSchema = z.object({
  id: z.string(),
});
export type TDelete<Feature>ValidationSchema = z.infer<typeof Delete<Feature>ValidationSchema>;

export const Delete<Feature>ActionSchema = z.object({
  payload: Delete<Feature>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
```

> **Rules:**
> - All date fields: `z.coerce.date()` — Better Auth returns dates as ISO strings over the wire
> - Delete/Get-by-id validation schemas: only include fields the API actually needs (don't reuse schemas that have extra required fields)
> - Form schemas that have UI-only fields (e.g. `confirmPassword`) should be separate from validation schemas

---

## Step 2 — Entities: Payload Types (optional)

**Path:** `src/modules/entities/types/admin/<feature>.type.ts`

Only needed when the TS types are complex enough to be reused outside schemas. Skip for simple features.

```typescript
export type TCreate<Feature>Payload = {
  name: string;
  // ...
};
```

---

## Step 3 — Domain: Service Interface

**Path:** `src/modules/server/core/admin/domain/interfaces/<feature>.service.interface.ts`

Only interfaces — zero implementation, zero framework imports.

```typescript
import {
  TGet<Feature>sResponseDtoSchema,
  T<Feature>Schema,
  TCreate<Feature>ValidationSchema,
  TUpdate<Feature>ValidationSchema,
  TDelete<Feature>ValidationSchema,
} from "@/modules/entities/schemas/admin/<feature>/<feature>.schema";

export interface I<Feature>Service {
  get<Feature>s(): Promise<TGet<Feature>sResponseDtoSchema>;
  create<Feature>(payload: TCreate<Feature>ValidationSchema): Promise<T<Feature>Schema>;
  update<Feature>(payload: TUpdate<Feature>ValidationSchema): Promise<T<Feature>Schema>;
  delete<Feature>(payload: TDelete<Feature>ValidationSchema): Promise<{ success: boolean }>;
}
```

---

## Step 4 — Infrastructure: Service Implementation

**Path:** `src/modules/server/core/admin/infrastructure/services/<feature>.service.ts`

```typescript
import { headers } from "next/headers";
import { auth } from "@/modules/server/auth-provider/auth";
import { I<Feature>Service } from "../../domain/interfaces/<feature>.service.interface";
import {
  Get<Feature>sResponseDtoSchema, TGet<Feature>sResponseDtoSchema,
  <Feature>Schema, T<Feature>Schema,
  TCreate<Feature>ValidationSchema,
  TUpdate<Feature>ValidationSchema,
  TDelete<Feature>ValidationSchema,
} from "@/modules/entities/schemas/admin/<feature>/<feature>.schema";

export class <Feature>Service implements I<Feature>Service {
  async get<Feature>s(): Promise<TGet<Feature>sResponseDtoSchema> {
    try {
      const res = await auth.api.list<Feature>s({
        query: {},
        headers: await headers(),     // ALWAYS required for server-side Better Auth
      });
      return await Get<Feature>sResponseDtoSchema.parseAsync(res);
    } catch (error) {
      throw error;
    }
  }

  async create<Feature>(payload: TCreate<Feature>ValidationSchema): Promise<T<Feature>Schema> {
    try {
      const res = await auth.api.create<Feature>({
        body: { ...payload },
        headers: await headers(),
      });
      // IMPORTANT: check what the method returns — most return { user } or { client },
      // but some (e.g. adminUpdateUser) return the object directly without a wrapper.
      return await <Feature>Schema.parseAsync(res.<feature>);  // or just res if no wrapper
    } catch (error) {
      throw error;
    }
  }

  async delete<Feature>(payload: TDelete<Feature>ValidationSchema): Promise<{ success: boolean }> {
    try {
      await auth.api.delete<Feature>({
        body: { id: payload.id },
        headers: await headers(),
      });
      return { success: true };   // some Better Auth deletes return void — build the object yourself
    } catch (error) {
      throw error;
    }
  }
}
```

> **Critical — Better Auth return types vary:**
> | Method | Returns |
> |---|---|
> | `setRole`, `banUser`, `unbanUser`, `createUser` | `{ user: UserWithRole }` → use `res.user` |
> | `adminUpdateUser` | `UserWithRole` directly → use `res` |
> | `adminCreateOAuthClient`, `adminUpdateOAuthClient`, `rotateClientSecret` | `OAuthClient` directly → use `res` |
> | `deleteOAuthClient`, `removeUser` | `void` or `{ success }` — build return value yourself |
> | `getOAuthClient` | GET method — use `query:` not `body:` |

---

## Step 5 — DI: Register the Module

Four files must be updated whenever a new service is added.

**1. Create `src/modules/server/di/modules/admin/<feature>.module.ts`:**

```typescript
import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { <Feature>Service } from "@/modules/server/core/admin/infrastructure/services/<feature>.service";

export function register<Feature>Module(container: Container) {
  container.bind(DI_SYMBOLS.I<Feature>Service).toClass(<Feature>Service);
}
```

**2. Update `src/modules/server/di/types.ts`:**

```typescript
// In DI_SYMBOLS object:
I<Feature>Service: Symbol.for("I<Feature>Service"),

// In DI_RETURN_TYPES interface:
I<Feature>Service: I<Feature>Service;
```

**3. Update `src/modules/server/di/modules/index.ts`:**

```typescript
export * from "./admin/<feature>.module";
```

**4. Update `src/modules/server/di/container.ts`:**

```typescript
import { register<Feature>Module } from "./modules";

register<Feature>Module(ApplicationContainer);
```

---

## Step 6 — Application: Use Cases

**Path:** `src/modules/server/core/admin/application/usecases/<feature>/`

One file per operation. Keep minimal — get service from DI, call one method, return.

```typescript
// get<Feature>s.usecase.ts
import { TGet<Feature>sResponseDtoSchema } from "@/modules/entities/schemas/admin/<feature>/<feature>.schema";
import { getInjection } from "@/modules/server/di/container";

export async function get<Feature>sUseCase(): Promise<TGet<Feature>sResponseDtoSchema> {
  const service = getInjection("I<Feature>Service");
  return await service.get<Feature>s();
}
```

```typescript
// create<Feature>.usecase.ts
export async function create<Feature>UseCase(
  payload: TCreate<Feature>ValidationSchema,
): Promise<T<Feature>Schema> {
  const service = getInjection("I<Feature>Service");
  return await service.create<Feature>(payload);
}
```

Create `index.ts` that re-exports all use cases:

```typescript
export * from "./get<Feature>s.usecase";
export * from "./create<Feature>.usecase";
export * from "./update<Feature>.usecase";
export * from "./delete<Feature>.usecase";
```

---

## Step 7 — Interface Adapters: Controllers

**Path:** `src/modules/server/core/admin/interface-adapters/controllers/<feature>/`

Every controller follows the same pattern: validate → use case → presenter.

```typescript
// get<Feature>s.controller.ts
import { TGet<Feature>sResponseDtoSchema } from "@/modules/entities/schemas/admin/<feature>/<feature>.schema";
import { get<Feature>sUseCase } from "../../../application/usecases/<feature>";

function presenter(data: TGet<Feature>sResponseDtoSchema) {
  return data.<feature>s;   // strip pagination; return just the array
}

export type TGet<Feature>sControllerOutput = ReturnType<typeof presenter>;

export async function get<Feature>sController(): Promise<TGet<Feature>sControllerOutput> {
  const data = await get<Feature>sUseCase();
  return presenter(data);
}
```

```typescript
// create<Feature>.controller.ts
import { Create<Feature>ValidationSchema } from "@/modules/entities/schemas/admin/<feature>/<feature>.schema";
import { create<Feature>UseCase } from "../../../application/usecases/<feature>/create<Feature>.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: T<Feature>Schema) {
  return data;
}

export type TCreate<Feature>ControllerOutput = ReturnType<typeof presenter>;

export async function create<Feature>Controller(input: unknown): Promise<TCreate<Feature>ControllerOutput> {
  const parsed = await Create<Feature>ValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await create<Feature>UseCase(parsed.data);
  return presenter(data);
}
```

Create `index.ts` that re-exports all controllers.

---

## Step 8 — Presentation: Server Actions

**Path:** `src/modules/server/presentation/actions/admin/<feature>.action.ts`

```typescript
"use server";

import { createServerAction } from "zsa";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  get<Feature>sController, TGet<Feature>sControllerOutput,
  create<Feature>Controller, TCreate<Feature>ControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/<feature>";
import {
  Create<Feature>ActionSchema,
} from "@/modules/entities/schemas/admin/<feature>/<feature>.schema";

// Read (no input schema)
export const get<Feature>sAction = createServerAction().handler(async () => {
  return await runWithTransport<TGet<Feature>sControllerOutput>(async () => {
    const data = await get<Feature>sController();
    return { result: data };
  });
});

// Mutation (skipInputParsing: true — controller does the real validation)
export const create<Feature>Action = createServerAction()
  .input(Create<Feature>ActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreate<Feature>ControllerOutput>(async () => {
      const data = await create<Feature>Controller(input.payload);
      return {
        result: data,
        transport: input.transportOptions,   // triggers revalidatePath or redirect
      };
    });
  });
```

Export from `src/modules/server/presentation/actions/admin/index.ts`:

```typescript
export * from "./<feature>.action";
```

---

## Step 9 — Client: Types

**Path:** `src/modules/client/admin/types/<feature>.type.ts`

```typescript
import { TGet<Feature>sControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/<feature>/get<Feature>s.controller";
import { ZSAError } from "zsa";

export interface I<Feature>TableProps {
  <feature>s: TGet<Feature>sControllerOutput | null;
  error: ZSAError | null;
}

export type T<Feature> = TGet<Feature>sControllerOutput[number];
```

---

## Step 10 — Client: Zustand Store Updates

**Path:** `src/modules/client/admin/stores/admin.store.ts`

Add new modal types to the `ModalType` union:

```typescript
export type ModalType =
  // ... existing types
  | "create<Feature>"
  | "update<Feature>"
  | "delete<Feature>";
```

Add any context fields the new modals need to `ModalData`:

```typescript
export interface ModalData {
  // Users (existing)
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string | null;
  currentRole?: string | null;
  isBanned?: boolean;
  // OAuth Clients (existing)
  clientId?: string;
  clientName?: string;
  oauthClient?: TOAuthClient;
  // <Feature> (new)
  <feature>Id?: string;
  <feature>Name?: string;
}
```

> **Store usage in columns vs components:**
> - React components: `const openModal = useAdminStore((state) => state.onOpen);`
> - Column definitions (not React components): `const openModal = adminStore((state) => state.onOpen);`
>   Both `useAdminStore` and `adminStore` are the same Zustand store — exported under two names.

---

## Step 11 — Client: Table Component

**Path:** `src/modules/client/admin/components/<feature>/<Feature>Table.tsx`

```typescript
"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, <FeatureIcon>, Plus } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { I<Feature>TableProps } from "../../types/<feature>.type";
import { useAdminStore } from "../../stores/admin.store";
import { <feature>TableColumn } from "./<Feature>TableColumn";

function <Feature>Table({ <feature>s, error }: I<Feature>TableProps) {
  const openModal = useAdminStore((state) => state.onOpen);

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="text-destructive" />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        error={error}
      />
    );
  }

  if (!<feature>s || <feature>s.length === 0) {
    return (
      <EmptyState
        icon={<<FeatureIcon> />}
        title="No <Feature>s Found"
        description="..."
        buttonLabel="Add <Feature>"
        buttonIcon={<Plus />}
        buttonOnClick={() => openModal({ type: "create<Feature>" })}
      />
    );
  }

  return (
    <DataTable
      columns={<feature>TableColumn()}
      data={<feature>s}
      dataSize={<feature>s.length}
      label="<Feature>"
      addLabelName="Add <Feature>"
      searchField="<fieldName>"
      fallbackText="No <Feature>s Found"
      openModal={() => openModal({ type: "create<Feature>" })}
    />
  );
}

export default <Feature>Table;
```

---

## Step 12 — Client: Column Definitions

**Path:** `src/modules/client/admin/components/<feature>/<Feature>TableColumn.tsx`

```typescript
import { ColumnDef } from "@tanstack/react-table";
import { Edit, EllipsisVertical, Trash2 } from "lucide-react";
import { TanstackTableColumnSorting } from "@/modules/client/shared/components/table/tanstack-table-column-sorting";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminStore } from "../../stores/admin.store";   // NOT useAdminStore — no hooks in column defs
import { formatSmartDate } from "@/modules/shared/helper";
import { T<Feature> } from "../../types/<feature>.type";

export const <feature>TableColumn = (): ColumnDef<T<Feature>>[] => [
  // Sortable column
  {
    accessorKey: "name",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Name"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
  },
  // Status badge
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const active = row.original.active;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            active
              ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
          )}
        >
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  // Date column
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatSmartDate(row.original.createdAt)}
      </span>
    ),
  },
  // Actions column
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const item = row.original;
      const openModal = adminStore((state) => state.onOpen);  // adminStore, not useAdminStore

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ size: "icon", variant: "ghost" }), "rounded-full")}
          >
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="left">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {item.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => openModal({ type: "update<Feature>", data: { <feature>Id: item.id, <feature>Name: item.name } })}
            >
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500 dark:hover:!text-rose-500"
              onClick={() => openModal({ type: "delete<Feature>", data: { <feature>Id: item.id, <feature>Name: item.name } })}
            >
              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
```

**Badge colour conventions:**

| State | Tailwind classes |
|---|---|
| Active / Success | `bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400` |
| Primary / Info | `bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary` |
| Danger / Error | `bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 hover:text-rose-600 dark:text-rose-400` |
| Warning | `bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400` |
| Neutral / Inactive | `bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground` |

---

## Step 13 — Client: Forms

**Path:** `src/modules/client/admin/forms/<feature>/<Op>Form.tsx`

Forms use `useFormContext` — the form instance is provided by `FormProvider` in the modal.

```typescript
"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { T<Op>FormSchema } from "@/modules/entities/schemas/admin/<feature>/<feature>.schema";
import { FormInput, FormSelect, FormSwitch } from "@/modules/client/shared/custom-form-fields";

interface <Op>FormProps {
  onSubmit: (data: T<Op>FormSchema) => Promise<void>;
  onCancel: () => void;
}

export function <Op>Form({ onSubmit, onCancel }: <Op>FormProps) {
  const { control, handleSubmit, formState: { isSubmitting } } = useFormContext<T<Op>FormSchema>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput control={control} name="fieldName" label="Field Label" placeholder="..." />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
```

---

## Step 14 — Client: Modals

**Path:** `src/modules/client/admin/modals/<feature>/<Op>Modal.tsx`

### Pattern A — Simple form modal (create/edit)

```typescript
"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminStore } from "../../stores/admin.store";
import { useServerAction } from "zsa-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Create<Feature>FormSchema, TCreate<Feature>FormSchema } from "@/modules/entities/schemas/admin/<feature>/<feature>.schema";
import { <Op>Form } from "../../forms/<feature>/<Op>Form";
import { create<Feature>Action } from "@/modules/server/presentation/actions/admin";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

export const Create<Feature>Modal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);

  const isModalOpen = isOpen && modalType === "create<Feature>";

  // For CREATE: use defaultValues (static initial state)
  const form = useForm<TCreate<Feature>FormSchema>({
    resolver: zodResolver(Create<Feature>FormSchema),
    defaultValues: { name: "" },
  });

  const { execute } = useServerAction(create<Feature>Action, {
    onSuccess() {
      toast.success("<Feature> created.");
      handleCloseModal();
    },
    onError({ err }) {
      handleZSAError<TCreate<Feature>FormSchema>({
        err,
        form,
        fallbackMessage: "Failed to create <feature>",
      });
    },
  });

  async function handleSubmit(values: TCreate<Feature>FormSchema) {
    await execute({
      payload: values,
      transportOptions: { shouldRevalidate: true, url: "/admin/<feature>s" },
    });
  }

  function handleCloseModal() {
    form.reset();
    closeModal();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create <Feature></DialogTitle>
          <DialogDescription>...</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <Create<Feature>Form onSubmit={handleSubmit} onCancel={handleCloseModal} />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
```

> **`defaultValues` vs `values`:**
> - `defaultValues` — use for **create** modals: sets initial state once on mount
> - `values` — use for **edit/update** modals: re-syncs the form whenever `modalData` changes (i.e. each time the modal opens for a different record)

```typescript
// Edit modal — use values: {...} to pre-fill from modalData
const form = useForm<TUpdate<Feature>FormSchema>({
  resolver: zodResolver(Update<Feature>FormSchema),
  values: {
    name: modalData?.<feature>Name ?? "",
    // ...
  },
});
```

### Pattern B — Simple confirmation modal (delete, revoke, etc.)

```typescript
export const Delete<Feature>Modal = () => {
  const closeModal = useAdminStore((state) => state.onClose);
  const modalType = useAdminStore((state) => state.type);
  const isOpen = useAdminStore((state) => state.isOpen);
  const modalData = useAdminStore((state) => state.data);

  const isModalOpen = isOpen && modalType === "delete<Feature>";

  const { execute, isPending } = useServerAction(delete<Feature>Action, {
    onSuccess() {
      toast.success("<Feature> deleted.");
      closeModal();
    },
    onError({ err }) {
      handleZSAError({ err, fallbackMessage: "Failed to delete <feature>" });
    },
  });

  async function handleDelete() {
    if (!modalData?.<feature>Id) return;
    await execute({
      payload: { id: modalData.<feature>Id },
      transportOptions: { shouldRevalidate: true, url: "/admin/<feature>s" },
    });
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete <Feature></DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete{" "}
            <span className="font-medium">{modalData?.<feature>Name ?? "this item"}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={isPending}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### Pattern C — Dual-mode modal (e.g. ban/unban)

One modal handles two related operations based on `modalData`:

```typescript
// isBanned: true  → user IS currently banned → show unban UI
// isBanned: false → user is NOT currently banned → show ban form
const isUnban = modalData?.isBanned === true;

// IMPORTANT: never invert this. isBanned reflects the CURRENT state of the user.
// The column should pass the user's actual isBanned value — don't override it.
```

### Pattern D — Two-phase modal (form → result display)

Used when the action returns sensitive data (e.g. client secret) that must be shown once:

```typescript
const [createdClient, setCreatedClient] = useState<TCreate<Feature>ResponseDtoSchema | null>(null);

const { execute } = useServerAction(create<Feature>Action, {
  onSuccess({ data }) {
    if (data) setCreatedClient(data);   // don't close — switch to result view
  },
});

// In JSX:
{createdClient ? (
  <>
    <DialogHeader><DialogTitle>Created — copy your credentials</DialogTitle></DialogHeader>
    {/* show client_id, client_secret with copy buttons */}
    <DialogFooter>
      <Button onClick={handleClose}>Done</Button>
    </DialogFooter>
  </>
) : (
  <>
    <DialogHeader>...</DialogHeader>
    <FormProvider {...form}>
      <Create<Feature>Form ... />
    </FormProvider>
  </>
)}
```

---

## Step 15 — Client: Modal Provider

**Path:** `src/modules/client/admin/provider/<Feature>ModalProvider.tsx`

The `useSyncExternalStore` guard prevents SSR/client hydration mismatches — always include it.

```typescript
"use client";

import { useSyncExternalStore } from "react";
import { Create<Feature>Modal } from "../modals/<feature>/Create<Feature>Modal";
import { Update<Feature>Modal } from "../modals/<feature>/Update<Feature>Modal";
import { Delete<Feature>Modal } from "../modals/<feature>/Delete<Feature>Modal";

export const <Feature>ModalProvider = () => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return null;

  return (
    <>
      <Create<Feature>Modal />
      <Update<Feature>Modal />
      <Delete<Feature>Modal />
    </>
  );
};
```

---

## Step 16 — Page + Layout

**`src/app/[locale]/admin/<feature>/page.tsx`:**

```typescript
import { requireRole } from "@/modules/server/shared/auth/require-role";
import { get<Feature>sAction } from "@/modules/server/presentation/actions/admin/<feature>.action";
import <Feature>Table from "@/modules/client/admin/components/<feature>/<Feature>Table";

async function <Feature>Page() {
  await requireRole(["superadmin"]);
  const [items, error] = await get<Feature>sAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold"><Feature>s</h1>
        <p className="text-sm text-muted-foreground">Manage <feature>s.</p>
      </div>
      <<Feature>Table <feature>s={items ?? null} error={error ?? null} />
    </div>
  );
}

export default <Feature>Page;
```

**`src/app/[locale]/admin/<feature>/layout.tsx`:**

```typescript
import { <Feature>ModalProvider } from "@/modules/client/admin/provider/<Feature>ModalProvider";

async function <Feature>Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <<Feature>ModalProvider />
    </>
  );
}

export default <Feature>Layout;
```

---

## Error Classes

| Class | When to throw |
|---|---|
| `InputParseError(zodError)` | Controller: Zod `safeParseAsync` failed on incoming input |
| `OutputParseError(zodError)` | Service: Zod `parseAsync` failed on Better Auth response |
| `ApplicationError` | Business rule violation (invalid state, forbidden action) |

All are mapped to ZSA errors by `mapErrorToZSA` inside `runWithTransport`.

Client-side error handling:

```typescript
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

onError({ err }) {
  handleZSAError<TFormSchema>({
    err,
    form,                          // pass form to map field-level errors
    fallbackMessage: "Failed to ...",
  });
}
```

---

## Transport Options

Passed as `transportOptions` in the action input to trigger post-mutation side effects:

```typescript
transportOptions: {
  shouldRevalidate: true,          // calls revalidatePath(url, revalidateType)
  url: "/admin/<feature>s",        // path to revalidate or redirect to
  revalidateType: "page",          // "page" (default) | "layout"
  shouldRedirect: true,            // calls redirect(url) — used for impersonation
}
```

> - For standard mutations (create/update/delete): use `shouldRevalidate: true`
> - For impersonation: use `shouldRedirect: true` so the browser picks up the new session cookie

---

## Data Flow Reference

```
app/[locale]/admin/<feature>/page.tsx
  ├── requireRole(["superadmin"])
  └── get<Feature>sAction()
        └── runWithTransport()
              └── get<Feature>sController()
                    └── get<Feature>sUseCase()
                          └── getInjection("I<Feature>Service").get<Feature>s()
                                └── auth.api.list<Feature>s({ headers })
                                      └── Get<Feature>sResponseDtoSchema.parseAsync(res)
                                            └── presenter(data) → T<Feature>[]
        └── <Feature>Table <feature>s={items} error={error}
              └── DataTable columns={<feature>TableColumn()} data={<feature>s}
                    └── <Feature>TableColumn → adminStore.onOpen({ type, data })
                          └── <Feature>ModalProvider
                                └── <Op>Modal → useAdminStore → useServerAction(action)
                                      └── action → runWithTransport → controller → useCase → service
```
