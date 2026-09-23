/**
 * @file selection-table-example.tsx
 * @description Example demonstrating row selection with a floating bulk-action
 * bar. Users can select individual rows via checkboxes or use the header
 * checkbox to select all. When at least one row is selected, the floating
 * DataTableSelectionBar appears with export options and a bulk-delete button.
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableExportButton,
  DataTableRowActions,
  DataTableSelectionBar,
  DataTableToolbar,
  useDataTable,
  type RowAction,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/** Represents a task/appointment in the demo */
interface Task {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  assignee: string;
  status: "todo" | "in-progress" | "done" | "cancelled";
  dueDate: string;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_TASKS: Task[] = [
  {
    id: "T001",
    title: "Schedule annual checkup for Mr. Johnson",
    priority: "medium",
    assignee: "Dr. Alice",
    status: "todo",
    dueDate: "2024-06-20",
  },
  {
    id: "T002",
    title: "Review lab results for patient P-4421",
    priority: "high",
    assignee: "Dr. Bob",
    status: "in-progress",
    dueDate: "2024-06-12",
  },
  {
    id: "T003",
    title: "Update prescription for Ms. Martinez",
    priority: "urgent",
    assignee: "Dr. Alice",
    status: "in-progress",
    dueDate: "2024-06-10",
  },
  {
    id: "T004",
    title: "Follow up with post-surgery patient",
    priority: "high",
    assignee: "Dr. Carol",
    status: "todo",
    dueDate: "2024-06-15",
  },
  {
    id: "T005",
    title: "Complete insurance claim documentation",
    priority: "low",
    assignee: "Admin",
    status: "todo",
    dueDate: "2024-06-30",
  },
  {
    id: "T006",
    title: "Conduct team training on new EMR module",
    priority: "medium",
    assignee: "Dr. Carol",
    status: "done",
    dueDate: "2024-06-08",
  },
  {
    id: "T007",
    title: "Order new supply of surgical gloves",
    priority: "low",
    assignee: "Pharmacy",
    status: "done",
    dueDate: "2024-06-07",
  },
  {
    id: "T008",
    title: "Prepare monthly performance report",
    priority: "medium",
    assignee: "Admin",
    status: "todo",
    dueDate: "2024-06-28",
  },
  {
    id: "T009",
    title: "Respond to patient complaint #8821",
    priority: "urgent",
    assignee: "Dr. Bob",
    status: "in-progress",
    dueDate: "2024-06-11",
  },
  {
    id: "T010",
    title: "Calibrate blood pressure monitors",
    priority: "low",
    assignee: "Tech",
    status: "todo",
    dueDate: "2024-06-25",
  },
  {
    id: "T011",
    title: "Review radiology images for Dr. Lee",
    priority: "high",
    assignee: "Dr. Alice",
    status: "todo",
    dueDate: "2024-06-14",
  },
  {
    id: "T012",
    title: "Patient discharge planning for Ward 3",
    priority: "medium",
    assignee: "Dr. Carol",
    status: "in-progress",
    dueDate: "2024-06-13",
  },
];

// ---------------------------------------------------------------------------
// Priority badge styling
// ---------------------------------------------------------------------------

const PRIORITY_VARIANTS: Record<
  Task["priority"],
  "destructive" | "default" | "secondary" | "outline"
> = {
  urgent: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

/**
 * Columns include a checkbox column for row selection plus filterable
 * title (text) and status (multiSelect) columns.
 */
const COLUMNS: ColumnDef<Task>[] = [
  {
    // Selection checkbox column — pinned left, not hideable
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
    size: 40,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("id")}
      </span>
    ),
    enableColumnFilter: false,
    meta: { label: "ID" },
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Task" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("title")}</span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    meta: { label: "Task", variant: "text", placeholder: "Search tasks..." },
    filterFn: (row, columnId, filterValue: string) =>
      String(row.getValue(columnId))
        .toLowerCase()
        .includes(filterValue.toLowerCase()),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Priority" />
    ),
    cell: ({ row }) => {
      const p = row.getValue("priority") as Task["priority"];
      return (
        <Badge variant={PRIORITY_VARIANTS[p]} className="capitalize">
          {p}
        </Badge>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      label: "Priority",
      variant: "multiSelect",
      options: [
        { label: "Urgent", value: "urgent" },
        { label: "High", value: "high" },
        { label: "Medium", value: "medium" },
        { label: "Low", value: "low" },
      ],
    },
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue(columnId)),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const s = row.getValue("status") as Task["status"];
      const labels: Record<Task["status"], string> = {
        todo: "To Do",
        "in-progress": "In Progress",
        done: "Done",
        cancelled: "Cancelled",
      };
      return <Badge variant="outline">{labels[s]}</Badge>;
    },
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "multiSelect",
      options: [
        { label: "To Do", value: "todo" },
        { label: "In Progress", value: "in-progress" },
        { label: "Done", value: "done" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue(columnId)),
  },
  {
    accessorKey: "assignee",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Assignee" />
    ),
    enableSorting: true,
    enableColumnFilter: false,
    meta: { label: "Assignee" },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Due Date" />
    ),
    enableSorting: true,
    enableColumnFilter: false,
    meta: { label: "Due Date" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const actions: RowAction<Task>[] = [
        {
          label: "View",
          icon: Eye,
          onClick: (r) => toast.info(`Viewing task ${r.original.id}`),
        },
        {
          label: "Edit",
          icon: Pencil,
          onClick: (r) => toast(`Editing: ${r.original.title}`),
          disabled: (r) =>
            r.original.status === "done" || r.original.status === "cancelled",
        },
        {
          label: "Delete",
          icon: Trash2,
          onClick: (r) => toast.error(`Deleted task ${r.original.id}`),
          destructive: true,
          separator: true,
        },
      ];
      return <DataTableRowActions row={row} actions={actions} />;
    },
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
    meta: { exportable: false },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Demonstrates row selection with:
 * - Individual row checkboxes + header select-all
 * - Floating DataTableSelectionBar when rows are selected (export + delete)
 * - DataTableExportButton in the toolbar for exporting all/filtered rows
 * - Filter toolbar for task name and status
 */
export function SelectionTableExample() {
  const [data, setData] = React.useState<Task[]>(DEMO_TASKS);

  const { table } = useDataTable({
    columns: COLUMNS,
    data,
    initialPageSize: 10,
  });

  /** Removes all selected rows from the demo dataset */
  const handleDelete = React.useCallback(() => {
    const selectedIds = table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original.id);
    setData((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
    table.resetRowSelection();
  }, [table]);

  const clearFilters = React.useCallback(
    () => table.resetColumnFilters(),
    [table],
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-12">
      <SearchX className="size-9 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium">No tasks found</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Try adjusting your filters or search.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">Row Selection & Bulk Actions</h2>
        <p className="text-sm text-muted-foreground">
          Select rows via checkboxes; floating bar appears with export and
          delete. Each row also has a &quot;…&quot; actions menu.
        </p>
      </div>

      <DataTable table={table} emptyState={emptyState}>
        {/* Toolbar: filters on left, export button on right */}
        <div className="flex items-center justify-between gap-2">
          <DataTableToolbar table={table} className="flex-1" />
          <DataTableExportButton table={table} filename="tasks" title="Tasks" />
        </div>
      </DataTable>

      {/*
       * Floating selection bar — rendered into document.body via a portal.
       * Animates in when rows are selected, slides away when cleared.
       * Children (Delete button) appear to the right of the export dropdown.
       */}
      <DataTableSelectionBar table={table} filename="tasks-selected">
        <Button
          variant="destructive"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={handleDelete}
        >
          <Trash2 className="size-3" />
          Delete
        </Button>
      </DataTableSelectionBar>
    </div>
  );
}
