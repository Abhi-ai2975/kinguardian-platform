/**
 * HealthcareServicesTableColumn — TanStack Table column definitions for the
 * Healthcare Services table.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: HealthcareService
 *
 * Separating columns from the table component keeps HealthcareServicesTable
 * lean. Row actions call the Zustand admin store directly — no prop drilling.
 *
 * Columns:
 *  select | expand | name | active | provided by | category | contact | created_at | actions
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
import { THealthcareServiceResponse } from "@/modules/entities/schemas/healthcare-service";
import { adminStore } from "../../stores/admin.store";

// ── Filter option constants ────────────────────────────────────────────────────

/** Active status options for the Status filter. */
export const HEALTHCARE_SERVICE_ACTIVE_OPTIONS = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

// ── Row actions ───────────────────────────────────────────────────────────────

/**
 * Row-level actions. Each action opens the matching modal via the admin store —
 * no callbacks passed down from the parent component.
 */
export const HEALTHCARE_SERVICE_ROW_ACTIONS: RowAction<THealthcareServiceResponse>[] = [
  {
    label: "Edit",
    icon: Pencil,
    /** Opens the edit modal, passing the full healthcare service record as context. */
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "editHealthcareService",
        data: { healthcareService: row.original, healthcareServiceId: row.original.id },
      }),
  },
  {
    label: "Delete",
    icon: Trash2,
    destructive: true,
    separator: true,
    /** Opens the delete confirmation dialog with service id + name. */
    onClick: (row) =>
      adminStore.getState().onOpen({
        type: "deleteHealthcareService",
        data: {
          healthcareServiceId: row.original.id,
          healthcareServiceName: row.original.name ?? undefined,
        },
      }),
  },
];

// ── Column definitions ─────────────────────────────────────────────────────────

/**
 * Full column definition array for the Healthcare Services table.
 * Import in HealthcareServicesTable.tsx and pass directly to useServerDataTable.
 */
export const HEALTHCARE_SERVICES_COLUMNS: ColumnDef<THealthcareServiceResponse>[] = [
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

  // ── Name ─────────────────────────────────────────────────────────────────────
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
    /** fhir-gql has a real name filter for this resource — client-side match here
        just keeps the column responsive while the server-side filter round-trips. */
    filterFn: (row, id, value: string) =>
      String(row.getValue(id) ?? "")
        .toLowerCase()
        .includes(value.toLowerCase()),
  },

  // ── Active status ────────────────────────────────────────────────────────────
  {
    accessorKey: "active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const active = row.getValue<boolean | undefined>("active");
      if (active === undefined) return <span className="text-muted-foreground">—</span>;
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
      options: HEALTHCARE_SERVICE_ACTIVE_OPTIONS,
    },
    filterFn: (row, id, value: string[]) => {
      if (!value?.length) return true;
      const active = row.getValue<boolean | undefined>(id);
      return value.includes(String(active));
    },
  },

  // ── Provided by (Organization) ────────────────────────────────────────────────
  {
    accessorKey: "provided_by_display",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Provided By" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.getValue<string | undefined>("provided_by_display") ?? "—"}
      </span>
    ),
  },

  // ── Category (first entry) ────────────────────────────────────────────────────
  {
    id: "category",
    header: "Category",
    accessorFn: (row) => row.category?.[0]?.coding_display ?? row.category?.[0]?.text ?? "",
    cell: ({ row }) => {
      const cat = row.original.category?.[0];
      if (!cat) return <span className="text-muted-foreground">—</span>;
      return <Badge variant="secondary">{cat.coding_display ?? cat.text}</Badge>;
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

  // ── Row actions ────────────────────────────────────────────────────────────────
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <DataTableRowActions row={row} actions={HEALTHCARE_SERVICE_ROW_ACTIONS} />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    meta: { exportable: false },
  },
];
