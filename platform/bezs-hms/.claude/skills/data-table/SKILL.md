# /data-table

Scaffold a fully-featured data table for a new screen using the shared TanStack Table v8 system.

## Usage

```
/data-table <resource>
```

Examples:
- `/data-table appointment`
- `/data-table patient`
- `/data-table prescription`

---

## Architecture Overview

```
Page / Feature Component
  → useDataTable (or useServerDataTable)   ← wires TanStack Table instance
    → DataTable (or DataTableWithViews)    ← renders <table> + pagination
      → DataTableToolbar                   ← auto-renders all column filters
        → DataTableColumnHeader            ← sort controls per column header
        → DataTableRowActions              ← per-row action dropdown
        → DataTableExportButton            ← CSV / Excel / JSON / PDF export
        → DataTableViewOptions             ← column visibility + pin controls
```

All components live under:
```
src/modules/shared/components/tables/
```

Import everything from the barrel:
```typescript
import {
  DataTable,
  DataTableWithViews,
  DataTableToolbar,
  DataTableColumnHeader,
  DataTableRowActions,
  DataTableExpandButton,
  DataTableExportButton,
  DataTableViewOptions,
  DataTableSelectionBar,
  useDataTable,
  useServerDataTable,
  type RowAction,
  type FilterVariant,
} from "@/modules/shared/components/tables";
```

---

## Step-by-Step Instructions

### Step 1 — Define the data type and columns

```typescript
// Define the row type
interface Appointment {
  id: string;
  patientName: string;
  date: string;
  department: string;
  status: "scheduled" | "completed" | "cancelled";
  fee: number;
}

// Define row actions (define BEFORE columns so they can be shared with card view)
const APPOINTMENT_ACTIONS: RowAction<Appointment>[] = [
  {
    label: "View",
    icon: Eye,
    onClick: (row) => toast.info(`Viewing ${row.original.patientName}`),
  },
  {
    label: "Edit",
    icon: Pencil,
    onClick: (row) => toast(`Editing ${row.original.patientName}`),
    disabled: (row) => row.original.status === "cancelled",
  },
  {
    label: "Cancel",
    icon: Trash2,
    onClick: (row) => toast.warning(`Cancelling ${row.original.id}`),
    destructive: true,
    separator: true,
    disabled: (row) => row.original.status !== "scheduled",
  },
];

// Define columns
const COLUMNS: ColumnDef<Appointment>[] = [
  {
    accessorKey: "patientName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Patient" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("patientName")}</span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    meta: { label: "Patient", variant: "text", placeholder: "Search..." },
    filterFn: (row, id, value: string) =>
      String(row.getValue(id)).toLowerCase().includes(value.toLowerCase()),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => <Badge>{row.getValue("status")}</Badge>,
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "multiSelect",
      options: [
        { label: "Scheduled", value: "scheduled" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    filterFn: (row, id, value: string[]) =>
      !value?.length || value.includes(row.getValue(id)),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <DataTableRowActions row={row} actions={APPOINTMENT_ACTIONS} />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    meta: { exportable: false },
  },
];
```

### Step 2 — Wire the hook

#### Client-side (all data in memory)

```typescript
export function AppointmentsTable() {
  const { table } = useDataTable({
    columns: COLUMNS,
    data: APPOINTMENTS,        // full array
    initialPageSize: 10,
    // Optional: initial state
    initialSorting: [{ id: "date", desc: true }],
    initialColumnVisibility: { fee: false },
    initialColumnPinning: { left: ["patientName"], right: ["actions"] },
    initialExpanded: {},
    // Optional: resizing
    columnResizeMode: "onChange",
    defaultColumn: { size: 150, minSize: 60, maxSize: 600 },
    // Optional: sub-rows tree
    getSubRows: (row) => row.subRows ?? [],
    // Optional: row expand detail panel
    getRowCanExpand: () => true,
  });
  // ...
}
```

#### Server-side (paginated fetch)

```typescript
export function AppointmentsTable() {
  const { table, state, isLoading } = useServerDataTable({
    columns: COLUMNS,
    data: serverData ?? [],
    rowCount: totalCount ?? 0,
    initialPageSize: 10,
  });

  // Drive your server action/query from state:
  // state.pagination.pageIndex, state.pagination.pageSize,
  // state.sorting, state.globalFilter
  // ...
}
```

### Step 3 — Render with DataTable

#### Basic (no grid view)

```typescript
return (
  <DataTable
    table={table}
    emptyState={<EmptyState clearFilters={clearFilters} />}
    loading={isLoading}
    loadingRowCount={10}
    rowHeight="medium"        // "short" | "medium" | "tall" | "extra-tall"
    pageSizeOptions={[10, 20, 50]}
    actionBar={<SelectionBar table={table} />}
  >
    {/* Children appear above the table — put your toolbar here */}
    <DataTableToolbar table={table} />
  </DataTable>
);
```

#### With grid/card view toggle

```typescript
return (
  <DataTableWithViews
    table={table}
    emptyState={<EmptyState />}
    loading={isLoading}
    renderCard={(row) => <AppointmentCard row={row} />}
  >
    <DataTableToolbar table={table} />
  </DataTableWithViews>
);
```

#### With row expand — detail panel

```typescript
return (
  <DataTable
    table={table}
    renderSubComponent={(row) => <AppointmentDetailPanel row={row} />}
  >
    <DataTableToolbar table={table} />
  </DataTable>
);
// In useDataTable: getRowCanExpand: () => true
// In columns: add the expand column (see Step 4 → Expand column)
```

#### With row expand — sub-rows / tree

```typescript
// In useDataTable: getSubRows: (row) => row.subRows ?? []
// No renderSubComponent needed — TanStack inserts child rows automatically.
// In columns: add the expand column (see Step 4 → Expand column)
```

---

## Step 4 — Column Recipes

### Filter variants (set in `meta`)

| `variant` | Filter control rendered | `filterFn` needed |
|---|---|---|
| `"text"` | Text input | `(row, id, v: string) => row.getValue(id).includes(v)` |
| `"select"` | Single-select dropdown | `(row, id, v: string[]) => v.includes(row.getValue(id))` |
| `"multiSelect"` | Multi-select faceted | `(row, id, v: string[]) => !v.length \|\| v.includes(row.getValue(id))` |
| `"number"` | Number input | built-in TanStack |
| `"range"` | Min/Max slider | `(row, id, v: [n,n]) => v[0] <= row.getValue(id) <= v[1]` |
| `"date"` | Date picker | use `dateFilterFn` from utils |
| `"dateRange"` | Date range picker | use `dateRangeFilterFn` from utils |

### Select column (row selection)

```typescript
{
  id: "select",
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      aria-label="Select all"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(v) => row.toggleSelected(!!v)}
      aria-label="Select row"
    />
  ),
  enableSorting: false,
  enableHiding: false,
  enableResizing: false,
  size: 40,
  meta: { exportable: false },
},
```

### Expand column (row expand / tree)

```typescript
{
  id: "expand",
  header: () => null,
  cell: ({ row }) => <DataTableExpandButton row={row} />,
  enableSorting: false,
  enableHiding: false,
  enableResizing: false,
  size: 40,
  meta: { exportable: false },
},
```

### Actions column

```typescript
{
  id: "actions",
  header: () => <span className="sr-only">Actions</span>,
  cell: ({ row }) => <DataTableRowActions row={row} actions={RESOURCE_ACTIONS} />,
  enableSorting: false,
  enableHiding: false,
  enableResizing: false,
  size: 60,
  meta: { exportable: false },
},
```

### `meta` field reference

```typescript
meta: {
  label: string;             // Display name in toolbar filters + view options
  variant?: FilterVariant;   // Activates a filter control in DataTableToolbar
  placeholder?: string;      // Input placeholder for text/number variants
  options?: { label: string; value: string }[];  // For select/multiSelect
  range?: [number, number];  // For range variant
  exportable?: boolean;      // false → excluded from export dialogs
}
```

---

## Step 5 — Toolbar Composition

`DataTableToolbar` auto-renders all active filter controls from column `meta`. Put extra controls beside it:

```typescript
<DataTable table={table}>
  <div className="flex items-center justify-between gap-2">
    {/* Left: search / filters */}
    <DataTableToolbar table={table} />
    {/* Right: view controls */}
    <div className="flex items-center gap-2">
      <DataTableExportButton
        table={table}
        filename="appointments"
        title="Appointments Export"
      />
      <DataTableViewOptions table={table} />
    </div>
  </div>
</DataTable>
```

### Empty state with clear button

Always pair with a `clearFilters` callback:

```typescript
const clearFilters = React.useCallback(() => {
  table.resetColumnFilters();
  table.resetGlobalFilter();   // only if globalFilter is used
}, [table]);

const emptyState = (
  <div className="flex flex-col items-center gap-3 py-12">
    <SearchX className="size-9 text-muted-foreground/50" />
    <p className="text-sm font-medium">No results found</p>
    <Button variant="outline" size="sm" onClick={clearFilters}>
      Clear filters
    </Button>
  </div>
);
```

---

## Step 6 — Selection + Bulk Actions

Wire `DataTableSelectionBar` as the `actionBar` prop:

```typescript
const actionBar = (
  <DataTableSelectionBar table={table}>
    <Button
      variant="destructive"
      size="sm"
      onClick={() => {
        const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
        handleBulkDelete(ids);
      }}
    >
      <Trash2 className="mr-2 size-4" />
      Delete ({table.getFilteredSelectedRowModel().rows.length})
    </Button>
  </DataTableSelectionBar>
);

<DataTable table={table} actionBar={actionBar}>
  ...
</DataTable>
```

Add the select column (see Step 4) and `enableRowSelection: true` is already the default in `useDataTable`.

---

## Step 7 — File Placement Convention

Create the table as a module component, never inline in a page:

```
src/modules/client/<feature>/
├── components/
│   ├── <resource>-table.tsx         ← main table component
│   ├── <resource>-card.tsx          ← card for grid view (if needed)
│   └── <resource>-detail-panel.tsx  ← expand panel (if needed)
└── index.ts                         ← re-export for the page to import
```

Page only imports and renders:
```typescript
// src/app/[locale]/(apps)/<feature>/page.tsx
import { AppointmentsTable } from "@/modules/client/appointments";
export default function AppointmentsPage() {
  return <AppointmentsTable />;
}
```

---

## Feature Reference

| Feature | How to enable |
|---|---|
| Sorting | `enableSorting: true` on column + `DataTableColumnHeader` |
| Text filter | `enableColumnFilter: true` + `meta.variant: "text"` |
| Select / multiSelect filter | `meta.variant: "select"` or `"multiSelect"` + `meta.options` |
| Date / range filter | `meta.variant: "date"` / `"range"` + appropriate `filterFn` |
| Row selection | Add select column + `DataTableSelectionBar` as `actionBar` |
| Row actions | Add actions column with `DataTableRowActions` |
| Column visibility | `DataTableViewOptions` in toolbar |
| Column pinning | `initialColumnPinning` in `useDataTable` + `DataTableViewOptions` |
| Column resizing | `columnResizeMode: "onChange"` in `useDataTable` + `defaultColumn.minSize` |
| Row expand detail | `getRowCanExpand: () => true` + `renderSubComponent` + expand column |
| Row expand sub-rows | `getSubRows: (row) => row.subRows ?? []` + expand column |
| Grid/card view | `DataTableWithViews` + `renderCard` prop |
| Export | `DataTableExportButton` in toolbar |
| Server-side | `useServerDataTable` + drive server action from `state` |
| Global search | `initialGlobalFilter` + `DataTableGlobalSearch` component |
| Custom sort list | `DataTableSortList` component |
| Dynamic filters | `DataTableFilterList` component |
| Row height | `rowHeight` prop on `DataTable` or `DataTableRowHeight` component |

---

## Rules

- Always define `RESOURCE_ACTIONS` constant **before** `COLUMNS` so the actions array can be shared between the table column cell and any card renderer
- Set `enableResizing: false` on select / expand / actions columns — they should never be resizable
- Set `meta: { exportable: false }` on select / expand / actions columns — they carry no data worth exporting
- Use `DataTableWithViews` when the screen benefits from a grid/card toggle; use `DataTable` otherwise
- `renderSubComponent` (detail panel) and `getSubRows` (tree) are mutually exclusive patterns — choose one per table
- Column pinning requires wide tables that scroll; avoid pinning on narrow tables where columns already fit
- Column resizing is best on wide tables (≥8 columns); for narrow tables the default auto-layout already fills the container naturally
- Always provide an `emptyState` — never rely on the default "No results." fallback for production screens
- For server-side tables, all filtering/sorting/pagination must be driven from `useServerDataTable`'s `state` object — never apply client-side logic to server data
- `DataTableToolbar` auto-renders ALL columns with `enableColumnFilter: true` and a `meta.variant` — no manual filter wiring needed

## Examples Reference

All 10 examples live at `/table-examples` and in:
```
src/modules/client/table-examples/components/
├── basic-table-example.tsx          ← text + select filters, sort
├── advanced-filters-example.tsx     ← range, date, dateRange, multiSelect
├── selection-table-example.tsx      ← checkbox selection + bulk actions
├── grid-view-example.tsx            ← table / card toggle, row actions in both views
├── custom-toolbar-example.tsx       ← global search, sort builder, filter builder, row height
├── server-table-example.tsx         ← server-side pagination + sorting
├── row-actions-example.tsx          ← row actions, loading state, empty state
├── column-pinning-example.tsx       ← 12-col wide table, sticky left/right, column resize
├── row-expand-detail-example.tsx    ← chevron expand → full-width detail panel
└── row-expand-subrows-example.tsx   ← department → staff tree, depth indentation
```
