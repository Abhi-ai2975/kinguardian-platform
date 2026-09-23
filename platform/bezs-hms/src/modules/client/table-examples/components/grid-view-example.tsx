/**
 * @file grid-view-example.tsx
 * @description Example demonstrating the dual view (table + grid/card) toggle
 * using DataTableWithViews. The same dataset and filters work in both views.
 * The card renderer is passed as a prop to DataTableWithViews which handles
 * the view toggle internally.
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Eye, Pencil, SearchX } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTableColumnHeader,
  DataTableExportButton,
  DataTableRowActions,
  DataTableToolbar,
  DataTableWithViews,
  useDataTable,
  type RowAction,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/** Represents a doctor / practitioner in the demo */
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: number; // years
  rating: number; // 1-5
  availability: "available" | "busy" | "on-leave";
  consultationFee: number;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_DOCTORS: Doctor[] = [
  { id: "D001", name: "Dr. Sarah Chen", specialty: "Cardiology", experience: 12, rating: 4.8, availability: "available", consultationFee: 150 },
  { id: "D002", name: "Dr. James Patel", specialty: "Neurology", experience: 9, rating: 4.6, availability: "busy", consultationFee: 180 },
  { id: "D003", name: "Dr. Emily Rodriguez", specialty: "Oncology", experience: 15, rating: 4.9, availability: "available", consultationFee: 200 },
  { id: "D004", name: "Dr. Michael Kim", specialty: "Orthopedics", experience: 7, rating: 4.3, availability: "on-leave", consultationFee: 130 },
  { id: "D005", name: "Dr. Lisa Anderson", specialty: "Dermatology", experience: 11, rating: 4.7, availability: "available", consultationFee: 120 },
  { id: "D006", name: "Dr. Robert Thompson", specialty: "Cardiology", experience: 20, rating: 4.9, availability: "busy", consultationFee: 250 },
  { id: "D007", name: "Dr. Jennifer Lee", specialty: "General", experience: 5, rating: 4.1, availability: "available", consultationFee: 80 },
  { id: "D008", name: "Dr. David Wilson", specialty: "Neurology", experience: 14, rating: 4.8, availability: "available", consultationFee: 190 },
  { id: "D009", name: "Dr. Priya Sharma", specialty: "Oncology", experience: 8, rating: 4.5, availability: "busy", consultationFee: 175 },
  { id: "D010", name: "Dr. Mark Davis", specialty: "Orthopedics", experience: 18, rating: 4.7, availability: "available", consultationFee: 160 },
  { id: "D011", name: "Dr. Nina Johansson", specialty: "Dermatology", experience: 6, rating: 4.2, availability: "available", consultationFee: 100 },
  { id: "D012", name: "Dr. Carlos Reyes", specialty: "General", experience: 10, rating: 4.4, availability: "on-leave", consultationFee: 90 },
];

// ---------------------------------------------------------------------------
// Availability badge
// ---------------------------------------------------------------------------

const AVAILABILITY_VARIANT: Record<
  Doctor["availability"],
  "default" | "secondary" | "outline"
> = {
  available: "default",
  busy: "secondary",
  "on-leave": "outline",
};

// ---------------------------------------------------------------------------
// Row actions — shared by both table view (actions column) and card view
// ---------------------------------------------------------------------------

/** Actions available on every doctor record, shown in both table and card views. */
const DOCTOR_ACTIONS: RowAction<Doctor>[] = [
  { label: "View",  icon: Eye,    onClick: (r) => toast.info(`Viewing ${r.original.name}`) },
  { label: "Edit",  icon: Pencil, onClick: (r) => toast(`Editing ${r.original.name}`) },
];

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDef<Doctor>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Doctor" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">
            {(row.getValue("name") as string)
              .split(" ")
              .slice(-1)[0]
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    meta: { label: "Doctor", variant: "text", placeholder: "Search doctors..." },
    filterFn: (row, columnId, filterValue: string) =>
      String(row.getValue(columnId))
        .toLowerCase()
        .includes(filterValue.toLowerCase()),
  },
  {
    accessorKey: "specialty",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Specialty" />
    ),
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      label: "Specialty",
      variant: "multiSelect",
      options: [
        { label: "Cardiology", value: "Cardiology" },
        { label: "Neurology", value: "Neurology" },
        { label: "Oncology", value: "Oncology" },
        { label: "Orthopedics", value: "Orthopedics" },
        { label: "Dermatology", value: "Dermatology" },
        { label: "General", value: "General" },
      ],
    },
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue(columnId)),
  },
  {
    accessorKey: "experience",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Exp. (yrs)" />
    ),
    enableSorting: true,
    enableColumnFilter: false,
    meta: { label: "Experience" },
  },
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Rating" />
    ),
    cell: ({ row }) => {
      const r = row.getValue("rating") as number;
      return <span>{"★".repeat(Math.floor(r))} {r}</span>;
    },
    enableSorting: true,
    enableColumnFilter: false,
    meta: { label: "Rating" },
  },
  {
    accessorKey: "availability",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Availability" />
    ),
    cell: ({ row }) => {
      const a = row.getValue("availability") as Doctor["availability"];
      return (
        <Badge variant={AVAILABILITY_VARIANT[a]} className="capitalize">
          {a.replace("-", " ")}
        </Badge>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      label: "Availability",
      variant: "select",
      options: [
        { label: "Available", value: "available" },
        { label: "Busy", value: "busy" },
        { label: "On Leave", value: "on-leave" },
      ],
    },
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue(columnId)),
  },
  {
    accessorKey: "consultationFee",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Fee" />
    ),
    cell: ({ row }) => (
      <span>${row.getValue("consultationFee")}</span>
    ),
    enableSorting: true,
    enableColumnFilter: false,
    meta: { label: "Fee" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <DataTableRowActions row={row} actions={DOCTOR_ACTIONS} />,
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
    meta: { exportable: false },
  },
];

// ---------------------------------------------------------------------------
// Card renderer
// ---------------------------------------------------------------------------

/**
 * Renders a single doctor row as a Card for the grid view.
 * Receives the full TanStack Row so it can access typed `row.original`.
 * The "…" actions menu (DataTableRowActions) appears in the top-right corner
 * of the card, mirroring the actions column in table view.
 *
 * @param row - TanStack Row for this doctor record.
 */
function DoctorCard({ row }: { row: Row<Doctor> }) {
  const d = row.original;
  const initials = d.name.split(" ").slice(-1)[0].slice(0, 2).toUpperCase();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{d.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{d.specialty}</p>
            </div>
          </div>
          {/* Actions menu in the card top-right — same actions as table view */}
          <DataTableRowActions row={row} actions={DOCTOR_ACTIONS} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <Badge
            variant={AVAILABILITY_VARIANT[d.availability]}
            className="capitalize text-xs"
          >
            {d.availability.replace("-", " ")}
          </Badge>
          <span className="font-medium">${d.consultationFee} / visit</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{d.experience} yrs exp.</span>
          <span className="text-amber-500">
            {"★".repeat(Math.floor(d.rating))}
            <span className="text-muted-foreground ml-1">{d.rating}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Demonstrates DataTableWithViews providing both table and grid (card) modes.
 * The toolbar, filters, and pagination are shared between both views.
 * Toggle between views using the Table/Grid buttons in the top-right.
 * Per-row actions, empty state, and export are all included.
 */
export function GridViewExample() {
  const { table } = useDataTable({
    columns: COLUMNS,
    data: DEMO_DOCTORS,
    initialPageSize: 9,
  });

  const clearFilters = React.useCallback(
    () => table.resetColumnFilters(),
    [table],
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-12">
      <SearchX className="size-9 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium">No doctors found</p>
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
        <h2 className="text-lg font-semibold">Table + Grid View Toggle</h2>
        <p className="text-sm text-muted-foreground">
          Switch between table and card-grid views. Per-row actions and export
          available in table view; filters and pagination are shared.
        </p>
      </div>
      <DataTableWithViews
        table={table}
        renderCard={(row) => <DoctorCard row={row as Row<Doctor>} />}
        defaultView="grid"
        gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        toolbar={
          <div className="flex flex-1 items-center gap-2">
            <DataTableToolbar table={table} className="flex-1" />
            <DataTableExportButton table={table} filename="doctors" title="Doctors" />
          </div>
        }
        pageSizeOptions={[9, 18, 27]}
        emptyState={emptyState}
      />
    </div>
  );
}
