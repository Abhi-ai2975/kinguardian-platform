/**
 * PractitionersTableColumn — TanStack Table column definitions for the
 * Practitioners table.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Practitioner
 *
 * Separating columns from the table component keeps PractitionersTable lean.
 * Row actions call the Zustand admin store directly — no prop drilling needed.
 *
 * Columns:
 *  select | expand | name (composed from names[0]) | gender | active |
 *  primary contact | created_at | actions
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
import { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";
import { practitionerLabel } from "../../queries/practitioner.queries";
import { adminStore } from "../../stores/admin.store";

// ── Row actions ───────────────────────────────────────────────────────────────

export const PRACTITIONER_ROW_ACTIONS: RowAction<TPractitionerResponse>[] = [
  {
    label: "Edit",
    icon: Pencil,
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "editPractitioner",
        data: { practitioner: row.original, practitionerId: row.original.id },
      }),
  },
  {
    label: "Delete",
    icon: Trash2,
    destructive: true,
    separator: true,
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "deletePractitioner",
        data: {
          practitionerId: row.original.id,
          practitionerLabel: practitionerLabel(row.original),
        },
      }),
  },
];

// ── Column definitions ─────────────────────────────────────────────────────────

/**
 * Full column definition array for the Practitioners table.
 * Import in PractitionersTable.tsx and pass directly to useServerDataTable.
 */
export const PRACTITIONERS_COLUMNS: ColumnDef<TPractitionerResponse>[] = [
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

  // ── Name — composed from names[0], Practitioner has no flat name field ───────
  {
    id: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Name" />
    ),
    accessorFn: (row) => practitionerLabel(row),
    cell: ({ row }) => (
      <span className="font-medium">{practitionerLabel(row.original)}</span>
    ),
    enableSorting: false,
    enableColumnFilter: true,
    meta: {
      label: "Name",
      variant: "text",
      placeholder: "Search by name…",
    },
    /** Client-side substring match — the real API has no combined-name filter for Practitioner. */
    filterFn: (row, id, value: string) =>
      String(row.getValue(id) ?? "")
        .toLowerCase()
        .includes(value.toLowerCase()),
  },

  // ── Gender ───────────────────────────────────────────────────────────────────
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Gender" />
    ),
    cell: ({ row }) => {
      const gender = row.getValue<string | undefined>("gender");
      if (!gender) return <span className="text-muted-foreground">—</span>;
      return <Badge variant="outline" className="capitalize">{gender}</Badge>;
    },
    enableColumnFilter: true,
    meta: {
      label: "Gender",
      variant: "multiSelect",
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
        { label: "Other", value: "other" },
        { label: "Unknown", value: "unknown" },
      ],
    },
    filterFn: (row, id, value: string[]) => {
      if (!value?.length) return true;
      const gender = row.getValue<string | undefined>(id);
      return value.includes(gender ?? "");
    },
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
      <DataTableRowActions row={row} actions={PRACTITIONER_ROW_ACTIONS} />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    meta: { exportable: false },
  },
];
