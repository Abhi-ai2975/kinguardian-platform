/**
 * OrganizationsTableColumn — TanStack Table column definitions for the Organizations table.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Organization
 *
 * Separating columns from the table component keeps OrganizationsTable lean.
 * Row actions call the Zustand admin store directly — no prop drilling needed.
 *
 * Columns:
 *  select | expand | name (pin-left) | type | status | parent org |
 *  contact | location | created_at | actions (pin-right)
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
import { TOrgResponse } from "@/modules/entities/schemas/organization";
import { adminStore } from "../../stores/admin.store";

// ── Filter option constants ────────────────────────────────────────────────────

/** FHIR organization type codes mapped to human-readable labels. */
export const ORG_TYPE_OPTIONS = [
  { label: "Healthcare Provider", value: "prov" },
  { label: "Hospital Department", value: "dept" },
  { label: "Organizational Team", value: "team" },
  { label: "Government", value: "govt" },
  { label: "Insurance Company", value: "ins" },
  { label: "Payer", value: "pay" },
  { label: "Educational Institute", value: "edu" },
  { label: "Religious Institution", value: "reli" },
  { label: "Business", value: "bus" },
  { label: "Other", value: "other" },
];

/** Active status options for the Status filter. */
export const ACTIVE_OPTIONS = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

// ── Row actions ───────────────────────────────────────────────────────────────

/**
 * Row-level actions. Each action opens the matching modal via the admin store —
 * no callbacks passed down from the parent component.
 */
export const ORG_ROW_ACTIONS: RowAction<TOrgResponse>[] = [
  {
    label: "Edit",
    icon: Pencil,
    /** Opens the edit modal, passing the full org record as context. */
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "editOrganization",
        data: { organization: row.original, organizationId: row.original.id },
      }),
  },
  {
    label: "Delete",
    icon: Trash2,
    destructive: true,
    separator: true,
    /** Opens the delete confirmation dialog with org id + name. */
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "deleteOrganization",
        data: {
          organizationId: row.original.id,
          organizationName: row.original.name,
        },
      }),
  },
];

// ── Column definitions ─────────────────────────────────────────────────────────

/**
 * Full column definition array for the Organizations table.
 * Import in OrganizationsTable.tsx and pass directly to useServerDataTable.
 */
export const ORGANIZATIONS_COLUMNS: ColumnDef<TOrgResponse>[] = [
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

  // ── Name (pinned left) ───────────────────────────────────────────────────────
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
    /** Client-side substring match — server-side search should be driven via query params. */
    filterFn: (row, id, value: string) =>
      String(row.getValue(id) ?? "")
        .toLowerCase()
        .includes(value.toLowerCase()),
  },

  // ── Organization type ────────────────────────────────────────────────────────
  {
    id: "orgType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Type" />
    ),
    accessorFn: (row) => row.type?.[0]?.coding_code ?? "",
    cell: ({ row }) => {
      const type = row.original.type?.[0];
      if (!type) return <span className="text-muted-foreground">—</span>;
      const label =
        type.coding_display ??
        ORG_TYPE_OPTIONS.find((o) => o.value === type.coding_code)?.label ??
        type.coding_code ??
        "Unknown";
      return <Badge variant="secondary">{label}</Badge>;
    },
    enableColumnFilter: true,
    meta: {
      label: "Type",
      variant: "multiSelect",
      options: ORG_TYPE_OPTIONS,
    },
    filterFn: (row, _id, value: string[]) => {
      if (!value?.length) return true;
      const code = row.original.type?.[0]?.coding_code ?? "";
      return value.includes(code);
    },
  },

  // ── Active status ────────────────────────────────────────────────────────────
  {
    accessorKey: "active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const active = row.getValue<boolean | undefined>("active");
      if (active === undefined)
        return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant={active ? "default" : "secondary"}>
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "multiSelect",
      options: ACTIVE_OPTIONS,
    },
    filterFn: (row, id, value: string[]) => {
      if (!value?.length) return true;
      const active = row.getValue<boolean | undefined>(id);
      return value.includes(String(active));
    },
  },

  // ── Parent organization display ──────────────────────────────────────────────
  {
    accessorKey: "partof_display",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Parent Org" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.getValue<string | undefined>("partof_display") ?? "—"}
      </span>
    ),
    // Not filterable — avoids a second text input alongside the name search.
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
      return (
        <span className="text-sm text-muted-foreground">{contact.value}</span>
      );
    },
    enableSorting: false,
  },

  // ── Primary address (city + state) ───────────────────────────────────────────
  {
    id: "address",
    header: "Location",
    accessorFn: (row) => {
      const addr = row.address?.[0];
      return [addr?.city, addr?.state].filter(Boolean).join(", ");
    },
    cell: ({ row }) => {
      const addr = row.original.address?.[0];
      const location = [addr?.city, addr?.state].filter(Boolean).join(", ");
      return (
        <span className="text-sm text-muted-foreground">
          {location || "—"}
        </span>
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
      <DataTableRowActions row={row} actions={ORG_ROW_ACTIONS} />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    meta: { exportable: false },
  },
];
