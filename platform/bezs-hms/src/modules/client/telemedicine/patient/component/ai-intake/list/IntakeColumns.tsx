/**
 * AI Intake table column definitions.
 *
 * Layer: client / telemedicine / patient / ai-intake / list
 *
 * Produces TanStack Table v8 ColumnDef array for the patient's AI Intake list.
 * Columns: ID, Mode, Status, Risk Level, Appointment ID, Date, Actions.
 *
 * Factory function pattern — callers pass action callbacks so the column
 * definitions remain pure and all navigation/modal logic lives in the parent.
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  DataTableColumnHeader,
  DataTableRowActions,
  type RowAction,
} from "@/modules/client/shared/components/tables";
import { Badge } from "@/components/ui/badge";
import { type TIntakeResponse } from "@/modules/entities/schemas/intake";
import { Eye, MessageSquare, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Status badge helpers ──────────────────────────────────────────────────────

/** @private Human-readable label for each intake status. */
const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
};

/** @private Tailwind class string for each intake status badge. */
const STATUS_CLASS: Record<string, string> = {
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  ABANDONED: "bg-red-100 text-red-800 border-red-200",
};

/**
 * Renders a coloured status Badge for a given intake status.
 *
 * @param status - Intake status string (IN_PROGRESS | COMPLETED | ABANDONED).
 */
function IntakeStatusBadge({ status }: { status: string | null | undefined }) {
  const label = STATUS_LABEL[status ?? ""] ?? status ?? "Unknown";
  const className = STATUS_CLASS[status ?? ""] ?? "";
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

/**
 * Renders a coloured Mode Badge (TEXT | VOICE).
 *
 * @param mode - Intake mode string.
 */
function IntakeModeBadge({ mode }: { mode: string | null | undefined }) {
  if (mode === "VOICE") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Mic className="size-3" />
        Voice
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <MessageSquare className="size-3" />
      Text
    </Badge>
  );
}

// ── Filter options ────────────────────────────────────────────────────────────

/** Status options for the multiSelect filter UI. */
export const INTAKE_STATUS_OPTIONS = [
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Abandoned", value: "ABANDONED" },
];

/** Mode options for the multiSelect filter UI. */
export const INTAKE_MODE_OPTIONS = [
  { label: "Text", value: "TEXT" },
  { label: "Voice", value: "VOICE" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO or Date-coerced date as a localised date string.
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
export interface IntakeColumnCallbacks {
  /** Called when "View" is clicked — navigates to the linked appointment or intake detail. */
  onView: (row: TIntakeResponse) => void;
}

/**
 * Builds the ColumnDef array for the AI Intake table.
 *
 * @param callbacks - Parent-provided navigation callbacks for row-level actions.
 * @returns TanStack Table v8 column definitions.
 */
export function createIntakeColumns(
  callbacks: IntakeColumnCallbacks,
): ColumnDef<TIntakeResponse>[] {
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

    // ── Mode ─────────────────────────────────────────────────────────────────
    {
      id: "mode",
      accessorFn: (row) => row.mode,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Mode" />
      ),
      cell: ({ row }) => <IntakeModeBadge mode={row.original.mode} />,
      meta: {
        label: "Mode",
        variant: "multiSelect",
        options: INTAKE_MODE_OPTIONS,
      },
      filterFn: (row, _columnId, filterValue: string[]) =>
        !filterValue?.length || filterValue.includes(row.original.mode ?? ""),
    },

    // ── Status ───────────────────────────────────────────────────────────────
    {
      id: "status",
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => <IntakeStatusBadge status={row.original.status} />,
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: INTAKE_STATUS_OPTIONS,
      },
      filterFn: (row, _columnId, filterValue: string[]) =>
        !filterValue?.length || filterValue.includes(row.original.status ?? ""),
    },

    // ── Risk Level (from AI report) ───────────────────────────────────────────
    {
      id: "risk_level",
      accessorFn: (row) => row.report?.risk_level ?? null,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Risk Level" />
      ),
      cell: ({ row }) => {
        const risk = row.original.report?.risk_level;
        if (!risk) return <span className="text-muted-foreground text-sm">—</span>;
        const cls =
          risk.toLowerCase() === "high"
            ? "bg-red-100 text-red-800 border-red-200"
            : risk.toLowerCase() === "medium"
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : "bg-green-100 text-green-800 border-green-200";
        return (
          <Badge variant="outline" className={`capitalize ${cls}`}>
            {risk}
          </Badge>
        );
      },
      meta: { label: "Risk Level" },
    },

    // ── Linked Appointment ────────────────────────────────────────────────────
    {
      id: "fhir_appointment_id",
      accessorFn: (row) => row.fhir_appointment_id,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Appointment" />
      ),
      cell: ({ row }) => {
        const id = row.original.fhir_appointment_id;
        return id ? (
          <span className="tabular-nums text-sm">#{id}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
      meta: { label: "Appointment" },
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
        const actions: RowAction<TIntakeResponse>[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => callbacks.onView(row.original),
          },
        ];
        return (
          <div className="flex items-center gap-1">
            {/* Inline view button */}
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
