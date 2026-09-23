/**
 * SlotsTableColumn — TanStack Table column definitions for the Slots table.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Slot
 *
 * Separating columns from the table component keeps SlotsTable lean.
 * Row actions call the Zustand admin store directly — no prop drilling needed.
 *
 * Columns:
 *  select | expand | status | start–end | schedule | overbooked |
 *  appointment type | created_at | actions
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
import { TSlotResponse } from "@/modules/entities/schemas/slot";
import { adminStore } from "../../stores/admin.store";

// ── Filter option constants ────────────────────────────────────────────────────

/** Fixed FHIR R4 Slot status codes — not terminology-bound, see SlotStatusSchema. */
export const SLOT_STATUS_OPTIONS = [
  { label: "Free", value: "free" },
  { label: "Busy", value: "busy" },
  { label: "Busy (Unavailable)", value: "busy-unavailable" },
  { label: "Busy (Tentative)", value: "busy-tentative" },
  { label: "Entered in Error", value: "entered-in-error" },
];

/** Badge variant per status — free is positive, busy-* is neutral/warning, error is destructive. */
function statusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "free":
      return "default";
    case "busy":
    case "busy-tentative":
      return "secondary";
    case "entered-in-error":
      return "destructive";
    default:
      return "outline";
  }
}

// ── Row actions ───────────────────────────────────────────────────────────────

export const SLOT_ROW_ACTIONS: RowAction<TSlotResponse>[] = [
  {
    label: "Edit",
    icon: Pencil,
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "editSlot",
        data: { slot: row.original, slotId: row.original.id },
      }),
  },
  {
    label: "Delete",
    icon: Trash2,
    destructive: true,
    separator: true,
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "deleteSlot",
        data: {
          slotId: row.original.id,
          slotLabel: row.original.start
            ? new Date(row.original.start).toLocaleString()
            : `Slot #${row.original.id}`,
        },
      }),
  },
];

// ── Column definitions ─────────────────────────────────────────────────────────

/**
 * Full column definition array for the Slots table.
 * Import in SlotsTable.tsx and pass directly to useServerDataTable.
 */
export const SLOTS_COLUMNS: ColumnDef<TSlotResponse>[] = [
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

  // ── Status ────────────────────────────────────────────────────────────────────
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue<string | undefined>("status");
      if (!status) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant={statusVariant(status)} className="capitalize">
          {status}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "multiSelect",
      options: SLOT_STATUS_OPTIONS,
    },
    filterFn: (row, id, value: string[]) => {
      if (!value?.length) return true;
      const status = row.getValue<string | undefined>(id);
      return value.includes(status ?? "");
    },
  },

  // ── Start – End ───────────────────────────────────────────────────────────────
  {
    id: "window",
    header: "Start – End",
    accessorFn: (row) => [row.start, row.end].filter(Boolean).join(" – "),
    cell: ({ row }) => {
      const start = row.original.start;
      const end = row.original.end;
      if (!start && !end) return <span className="text-muted-foreground">—</span>;
      const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "…");
      return (
        <span className="text-sm text-muted-foreground">
          {fmt(start)} – {fmt(end)}
        </span>
      );
    },
    enableSorting: false,
  },

  // ── Schedule ─────────────────────────────────────────────────────────────────
  {
    accessorKey: "schedule_display",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Schedule" />
    ),
    cell: ({ row }) => {
      const label = row.original.schedule_display;
      const id = row.original.schedule_id;
      return (
        <span className="text-sm text-muted-foreground">
          {label ?? (id ? `Schedule #${id}` : "—")}
        </span>
      );
    },
    enableSorting: false,
  },

  // ── Overbooked ───────────────────────────────────────────────────────────────
  {
    accessorKey: "overbooked",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Overbooked" />
    ),
    cell: ({ row }) => {
      const overbooked = row.getValue<boolean | undefined>("overbooked");
      return overbooked ? (
        <Badge variant="secondary">Overbooked</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
    enableSorting: false,
  },

  // ── Appointment type ─────────────────────────────────────────────────────────
  {
    id: "appointmentType",
    header: "Appointment Type",
    accessorFn: (row) => row.appointment_type_display ?? row.appointment_type_code ?? "",
    cell: ({ row }) => {
      const label =
        row.original.appointment_type_display ?? row.original.appointment_type_code;
      if (!label) return <span className="text-muted-foreground">—</span>;
      return <Badge variant="outline">{label}</Badge>;
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
      <DataTableRowActions row={row} actions={SLOT_ROW_ACTIONS} />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    meta: { exportable: false },
  },
];
