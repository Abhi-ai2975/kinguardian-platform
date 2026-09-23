/**
 * LocationsTableColumn — TanStack Table column definitions for the Locations table.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Location
 *
 * Separating columns from the table component keeps LocationsTable lean.
 * Row actions call the Zustand admin store directly — no prop drilling needed.
 *
 * Columns:
 *  select | expand | name | status | physical type | parent location |
 *  address | contact | created_at | actions
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
import { TLocationResponse } from "@/modules/entities/schemas/location";
import { adminStore } from "../../stores/admin.store";

// ── Filter option constants ────────────────────────────────────────────────────

/** Location status options for the Status filter. */
export const LOCATION_STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Inactive", value: "inactive" },
];

// ── Row actions ───────────────────────────────────────────────────────────────

/**
 * Row-level actions. Each action opens the matching modal via the admin store —
 * no callbacks passed down from the parent component.
 */
export const LOCATION_ROW_ACTIONS: RowAction<TLocationResponse>[] = [
  {
    label: "Edit",
    icon: Pencil,
    /** Opens the edit modal, passing the full location record as context. */
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "editLocation",
        data: { location: row.original, locationId: row.original.id },
      }),
  },
  {
    label: "Delete",
    icon: Trash2,
    destructive: true,
    separator: true,
    /** Opens the delete confirmation dialog with location id + name. */
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "deleteLocation",
        data: {
          locationId: row.original.id,
          locationName: row.original.name ?? undefined,
        },
      }),
  },
];

// ── Column definitions ─────────────────────────────────────────────────────────

/**
 * Full column definition array for the Locations table.
 * Import in LocationsTable.tsx and pass directly to useServerDataTable.
 */
export const LOCATIONS_COLUMNS: ColumnDef<TLocationResponse>[] = [
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

  // ── Name — optional on Location, unlike Organization ──────────────────────────
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name") ?? "—"}</span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      label: "Name",
      variant: "text",
      placeholder: "Search by name…",
    },
    /** Client-side substring match — the real API has no name filter for Location. */
    filterFn: (row, id, value: string) =>
      String(row.getValue(id) ?? "")
        .toLowerCase()
        .includes(value.toLowerCase()),
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
      const variant =
        status === "active"
          ? "default"
          : status === "suspended"
            ? "secondary"
            : "outline";
      return (
        <Badge variant={variant} className="capitalize">
          {status}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "multiSelect",
      options: LOCATION_STATUS_OPTIONS,
    },
    filterFn: (row, id, value: string[]) => {
      if (!value?.length) return true;
      const status = row.getValue<string | undefined>(id);
      return value.includes(status ?? "");
    },
  },

  // ── Physical type ─────────────────────────────────────────────────────────────
  {
    id: "physicalType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Physical Type" />
    ),
    accessorFn: (row) => row.physical_type_display ?? row.physical_type_code ?? "",
    cell: ({ row }) => {
      const label =
        row.original.physical_type_display ?? row.original.physical_type_code;
      if (!label) return <span className="text-muted-foreground">—</span>;
      return <Badge variant="secondary">{label}</Badge>;
    },
    enableSorting: false,
  },

  // ── Parent location display ───────────────────────────────────────────────────
  {
    accessorKey: "part_of_display",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Parent Location" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.getValue<string | undefined>("part_of_display") ?? "—"}
      </span>
    ),
  },

  // ── Address (city, state — flat accessors, unlike Organization's array) ──────
  {
    id: "address",
    header: "Address",
    accessorFn: (row) => [row.address_city, row.address_state].filter(Boolean).join(", "),
    cell: ({ row }) => {
      const location = [row.original.address_city, row.original.address_state]
        .filter(Boolean)
        .join(", ");
      return (
        <span className="text-sm text-muted-foreground">{location || "—"}</span>
      );
    },
    enableSorting: false,
  },

  // ── Primary contact (phone preferred over email) ─────────────────────────────
  {
    id: "telecom",
    header: "Contact",
    accessorFn: (row) => {
      const phone = row.telecom?.find((t) => t.system === "phone");
      const email = row.telecom?.find((t) => t.system === "email");
      return phone?.value ?? email?.value ?? "";
    },
    cell: ({ row }) => {
      const phone = row.original.telecom?.find((t) => t.system === "phone");
      const email = row.original.telecom?.find((t) => t.system === "email");
      const contact = phone ?? email;
      if (!contact) return <span className="text-muted-foreground">—</span>;
      return <span className="text-sm text-muted-foreground">{contact.value}</span>;
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
      <DataTableRowActions row={row} actions={LOCATION_ROW_ACTIONS} />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    meta: { exportable: false },
  },
];
