/**
 * PractitionerRolesTableColumn — TanStack Table column definitions for the
 * PractitionerRoles table.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: PractitionerRole
 *
 * Separating columns from the table component keeps PractitionerRolesTable
 * lean. Row actions call the Zustand admin store directly — no prop drilling
 * needed.
 *
 * Columns:
 *  select | expand | practitioner (display label — PractitionerRole has no
 *  name of its own) | organization | active | role/specialty badges |
 *  created_at | actions
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
import { TPractitionerRoleResponse } from "@/modules/entities/schemas/practitioner-role";
import { adminStore } from "../../stores/admin.store";

// ── Row actions ───────────────────────────────────────────────────────────────

export const PRACTITIONER_ROLE_ROW_ACTIONS: RowAction<TPractitionerRoleResponse>[] = [
  {
    label: "Edit",
    icon: Pencil,
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "editPractitionerRole",
        data: { practitionerRole: row.original, practitionerRoleId: row.original.id },
      }),
  },
  {
    label: "Delete",
    icon: Trash2,
    destructive: true,
    separator: true,
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "deletePractitionerRole",
        data: {
          practitionerRoleId: row.original.id,
          practitionerRoleLabel:
            row.original.practitioner_display ?? `PractitionerRole #${row.original.id}`,
        },
      }),
  },
];

// ── Column definitions ─────────────────────────────────────────────────────────

/**
 * Full column definition array for the PractitionerRoles table.
 * Import in PractitionerRolesTable.tsx and pass directly to useServerDataTable.
 */
export const PRACTITIONER_ROLES_COLUMNS: ColumnDef<TPractitionerRoleResponse>[] = [
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

  // ── Practitioner — the closest thing to a display label ──────────────────────
  {
    accessorKey: "practitioner_display",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Practitioner" />
    ),
    cell: ({ row }) => {
      const display = row.getValue<string | undefined>("practitioner_display");
      return (
        <span className="font-medium">
          {display || `PractitionerRole #${row.original.id}`}
        </span>
      );
    },
    enableSorting: false,
    enableColumnFilter: true,
    meta: {
      label: "Practitioner",
      variant: "text",
      placeholder: "Search by practitioner…",
    },
    /** Client-side substring match — the real API has no name filter for PractitionerRole. */
    filterFn: (row, id, value: string) =>
      String(row.getValue(id) ?? "")
        .toLowerCase()
        .includes(value.toLowerCase()),
  },

  // ── Organization ─────────────────────────────────────────────────────────────
  {
    accessorKey: "organization_display",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Organization" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.getValue<string | undefined>("organization_display") ?? "—"}
      </span>
    ),
    enableSorting: false,
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

  // ── Role / specialty summary ──────────────────────────────────────────────────
  {
    id: "roles",
    header: "Role / Specialty",
    cell: ({ row }) => {
      const code = row.original.code?.[0];
      const specialty = row.original.specialty?.[0];
      const labels = [code?.coding_display, specialty?.coding_display].filter(Boolean);
      if (labels.length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {labels.map((label, i) => (
            <Badge key={i} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
      );
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
      <DataTableRowActions row={row} actions={PRACTITIONER_ROLE_ROW_ACTIONS} />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    meta: { exportable: false },
  },
];
