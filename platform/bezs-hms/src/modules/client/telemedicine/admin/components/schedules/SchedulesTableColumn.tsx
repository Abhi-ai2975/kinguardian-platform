/**
 * SchedulesTableColumn — TanStack Table column definitions for the Schedules table.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Schedule
 *
 * Separating columns from the table component keeps SchedulesTable lean.
 * Row actions call the Zustand admin store directly — no prop drilling needed.
 *
 * Columns:
 *  select | expand | comment (display label — Schedule has no name field) |
 *  active | planning horizon | actors | created_at | actions
 */

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableExpandButton,
  DataTableRowActions,
  type RowAction,
} from "@/modules/client/shared/components/tables";
import { TScheduleResponse } from "@/modules/entities/schemas/schedule";
import { adminStore } from "../../stores/admin.store";

// ── Row actions ───────────────────────────────────────────────────────────────

/**
 * Row-level actions. Each action opens the matching modal via the admin store —
 * no callbacks passed down from the parent component.
 */
export const SCHEDULE_ROW_ACTIONS: RowAction<TScheduleResponse>[] = [
  {
    label: "Edit",
    icon: Pencil,
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "editSchedule",
        data: { schedule: row.original, scheduleId: row.original.id },
      }),
  },
  {
    label: "Delete",
    icon: Trash2,
    destructive: true,
    separator: true,
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "deleteSchedule",
        data: {
          scheduleId: row.original.id,
          scheduleLabel: row.original.comment ?? `Schedule #${row.original.id}`,
        },
      }),
  },
];

// ── Column definitions ─────────────────────────────────────────────────────────

/**
 * Full column definition array for the Schedules table.
 * Import in SchedulesTable.tsx and pass directly to useServerDataTable.
 */
export const SCHEDULES_COLUMNS: ColumnDef<TScheduleResponse>[] = [
  // ── Select column ────────────────────────────────────────────────────────────
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

  // ── Expand column ────────────────────────────────────────────────────────────
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

  // ── Comment — the closest thing to a display label; Schedule has no name ─────
  {
    accessorKey: "comment",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Comment" />
    ),
    cell: ({ row }) => {
      const comment = row.getValue<string | undefined>("comment");
      return (
        <span className="font-medium">
          {comment || `Schedule #${row.original.id}`}
        </span>
      );
    },
    enableSorting: false,
    enableColumnFilter: true,
    meta: {
      label: "Comment",
      variant: "text",
      placeholder: "Search by comment…",
    },
    /** Client-side substring match — the real API has no comment/name filter for Schedule. */
    filterFn: (row, id, value: string) =>
      String(row.getValue(id) ?? "")
        .toLowerCase()
        .includes(value.toLowerCase()),
  },

  // ── Active ───────────────────────────────────────────────────────────────────
  {
    accessorKey: "active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Active" />
    ),
    cell: ({ row }) => {
      const active = row.getValue<boolean | undefined>("active");
      return (
        <Badge variant={active ? "default" : "outline"}>
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: "Active",
      variant: "multiSelect",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
    filterFn: (row, id, value: string[]) => {
      if (!value?.length) return true;
      const active = row.getValue<boolean | undefined>(id);
      return value.includes(String(active ?? false));
    },
  },

  // ── Planning horizon ───────────────────────────────────────────────────────────
  {
    id: "planningHorizon",
    header: "Planning Horizon",
    accessorFn: (row) =>
      [row.planning_horizon_start, row.planning_horizon_end].filter(Boolean).join(" – "),
    cell: ({ row }) => {
      const start = row.original.planning_horizon_start;
      const end = row.original.planning_horizon_end;
      if (!start && !end) return <span className="text-muted-foreground">—</span>;
      const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "…");
      return (
        <span className="text-sm text-muted-foreground">
          {fmt(start)} – {fmt(end)}
        </span>
      );
    },
    enableSorting: false,
  },

  // ── Actors summary ──────────────────────────────────────────────────────────
  {
    id: "actors",
    header: "Actors",
    cell: ({ row }) => {
      const count = row.original.actor?.length ?? 0;
      if (count === 0) return <span className="text-muted-foreground">—</span>;
      return <Badge variant="secondary">{count} actor{count === 1 ? "" : "s"}</Badge>;
    },
    enableSorting: false,
  },

  // ── Created at ───────────────────────────────────────────────────────────────
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Created" />
    ),
    cell: ({ row }) => {
      const iso = row.getValue<string | undefined>("created_at");
      if (!iso) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(iso).toLocaleDateString()}
        </span>
      );
    },
    enableSorting: true,
  },

  // ── Row actions (pinned right) ───────────────────────────────────────────────
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <DataTableRowActions row={row} actions={SCHEDULE_ROW_ACTIONS} />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    meta: { exportable: false },
  },
];
