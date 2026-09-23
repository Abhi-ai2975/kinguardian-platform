/**
 * AI Consultation table column definitions.
 *
 * Layer: client / telemedicine / patient / ai-consultation / list
 *
 * Produces TanStack Table v8 ColumnDef array for the patient's AI Consultation list.
 * Columns: ID, Appointment, Status, Room, Date, Actions.
 *
 * Factory function pattern — callers pass action callbacks so the column
 * definitions remain pure and all navigation logic lives in the parent.
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  DataTableColumnHeader,
  DataTableRowActions,
  type RowAction,
} from "@/modules/client/shared/components/tables";
import { Badge } from "@/components/ui/badge";
import type { TConsultationListItem } from "@/modules/entities/schemas/consultation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Status badge helpers ──────────────────────────────────────────────────────

/** @private Human-readable label for each consultation status. */
const STATUS_LABEL: Record<string, string> = {
  WAITING: "Waiting",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
};

/** @private Tailwind class string for each consultation status badge. */
const STATUS_CLASS: Record<string, string> = {
  WAITING: "bg-amber-100 text-amber-800 border-amber-200",
  ACTIVE: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  ABANDONED: "bg-red-100 text-red-800 border-red-200",
};

/**
 * Renders a coloured status Badge for a given consultation status.
 *
 * @param status - Consultation status string.
 */
function ConsultationStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const label = STATUS_LABEL[status ?? ""] ?? status ?? "Unknown";
  const className = STATUS_CLASS[status ?? ""] ?? "";
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// ── Filter options ────────────────────────────────────────────────────────────

/** Status options for the multiSelect filter UI. */
export const CONSULTATION_STATUS_OPTIONS = [
  { label: "Waiting", value: "WAITING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Abandoned", value: "ABANDONED" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a Date object as a localised date string.
 *
 * @param d - Date object or nullish.
 * @returns Human-readable date string or "—".
 */
function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Column factory ────────────────────────────────────────────────────────────

/** Callbacks injected into the column actions cell by the parent table. */
export interface ConsultationColumnCallbacks {
  /** Called when "View" is clicked — navigates to the linked appointment detail. */
  onView: (row: TConsultationListItem) => void;
}

/**
 * Builds the ColumnDef array for the AI Consultation table.
 *
 * @param callbacks - Parent-provided navigation callbacks for row-level actions.
 * @returns TanStack Table v8 column definitions.
 */
export function createConsultationColumns(
  callbacks: ConsultationColumnCallbacks,
): ColumnDef<TConsultationListItem>[] {
  return [
    // ── ID ───────────────────────────────────────────────────────────────────
    {
      id: "id",
      accessorFn: (row) => row.id,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="ID" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          #{row.original.id}
        </span>
      ),
      meta: { label: "ID" },
    },

    // ── Linked Appointment ────────────────────────────────────────────────────
    {
      id: "fhir_appointment_id",
      accessorFn: (row) => row.fhir_appointment_id,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Appointment" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          #{row.original.fhir_appointment_id}
        </span>
      ),
      meta: { label: "Appointment" },
    },

    // ── Status ───────────────────────────────────────────────────────────────
    {
      id: "status",
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => (
        <ConsultationStatusBadge status={row.original.status} />
      ),
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: CONSULTATION_STATUS_OPTIONS,
      },
      filterFn: (row, _columnId, filterValue: string[]) =>
        !filterValue?.length || filterValue.includes(row.original.status ?? ""),
    },

    // ── Room ID ───────────────────────────────────────────────────────────────
    {
      id: "room_id",
      accessorFn: (row) => row.room_id,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Room" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.room_id}
        </span>
      ),
      meta: { label: "Room" },
    },

    // ── Date ─────────────────────────────────────────────────────────────────
    {
      id: "created_at",
      accessorFn: (row) => row.created_at,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Date" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {formatDate(row.original.created_at)}
        </span>
      ),
      meta: { label: "Date" },
    },

    // ── Actions ──────────────────────────────────────────────────────────────
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const actions: RowAction<TConsultationListItem>[] = [
          {
            label: "View Appointment",
            icon: Eye,
            onClick: () => callbacks.onView(row.original),
          },
        ];
        return (
          <div className="flex items-center gap-1">
            {/* Inline view button — navigates to the appointment detail page */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => callbacks.onView(row.original)}
            >
              <Eye className="size-3 mr-1" />
              View
            </Button>
            <DataTableRowActions row={row} actions={actions} />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 100,
    },
  ];
}
