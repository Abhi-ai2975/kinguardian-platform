/**
 * @file server-table-example.tsx
 * @description Demonstrates server-side pagination, sorting, filtering, and
 * global search using `useServerDataTable`. All data operations (filter,
 * sort, paginate) happen inside `mockFetchPatients()` — a function that
 * intentionally mimics a real async API with a network delay.
 *
 * To swap to a real backend:
 *   1. Replace `mockFetchPatients(state)` with your actual fetch/axios/React
 *      Query call, passing `state.sorting`, `state.columnFilters`,
 *      `state.pagination`, and `state.globalFilter` as query params.
 *   2. Remove the local FULL_DATASET array.
 *   3. Use `pageCount: Math.ceil(totalCount / state.pagination.pageSize)`.
 *
 * React Query wiring would look like:
 * ```tsx
 * const { data, isFetching } = useQuery({
 *   queryKey: ["patients", state],
 *   queryFn: () => api.getPatients(state),
 *   placeholderData: keepPreviousData,
 * });
 * ```
 *
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, SearchX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableColumnSearch,
  DataTableExportButton,
  DataTableRowActions,
  DataTableSortList,
  DataTableViewOptions,
  createColumnSearchFilterFn,
  exportTable,
  useServerDataTable,
  type ExportColumn,
  type ExportFormat,
  type RowAction,
  type SearchableColumn,
  type ServerTableState,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/** Represents a single patient record as returned by the server */
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  condition: string;
  ward: "General" | "ICU" | "Emergency" | "Outpatient" | "Pediatric";
  admittedDate: string; // ISO date string
  status: "admitted" | "discharged" | "critical" | "observation";
  doctor: string;
}

// ---------------------------------------------------------------------------
// Mock dataset — 60 patients (represents the full server-side table)
// ---------------------------------------------------------------------------

const FULL_DATASET: Patient[] = [
  { id: "P001", name: "Aisha Patel",       age: 34, gender: "Female", bloodType: "A+",  condition: "Hypertension",       ward: "General",    admittedDate: "2024-11-01", status: "admitted",    doctor: "Dr. Torres" },
  { id: "P002", name: "Bruno Costa",       age: 58, gender: "Male",   bloodType: "O-",  condition: "Diabetes Type 2",    ward: "Outpatient", admittedDate: "2024-11-03", status: "observation", doctor: "Dr. Klein" },
  { id: "P003", name: "Carmen Reyes",      age: 72, gender: "Female", bloodType: "B+",  condition: "Heart Failure",      ward: "ICU",        admittedDate: "2024-10-28", status: "critical",    doctor: "Dr. Sharma" },
  { id: "P004", name: "David Müller",      age: 45, gender: "Male",   bloodType: "AB+", condition: "Appendicitis",       ward: "General",    admittedDate: "2024-11-05", status: "admitted",    doctor: "Dr. Gupta" },
  { id: "P005", name: "Evelyn Nakamura",   age: 29, gender: "Female", bloodType: "O+",  condition: "Asthma",             ward: "Emergency",  admittedDate: "2024-11-07", status: "discharged",  doctor: "Dr. Tanaka" },
  { id: "P006", name: "Femi Adeyemi",      age: 63, gender: "Male",   bloodType: "A-",  condition: "Stroke",             ward: "ICU",        admittedDate: "2024-10-30", status: "critical",    doctor: "Dr. Svensson" },
  { id: "P007", name: "Grace Liu",         age: 41, gender: "Female", bloodType: "B-",  condition: "Migraine",           ward: "Outpatient", admittedDate: "2024-11-08", status: "observation", doctor: "Dr. Torres" },
  { id: "P008", name: "Hassan Ali",        age: 55, gender: "Male",   bloodType: "O+",  condition: "Kidney Stones",      ward: "General",    admittedDate: "2024-11-02", status: "admitted",    doctor: "Dr. Klein" },
  { id: "P009", name: "Irene Johansson",   age: 38, gender: "Female", bloodType: "A+",  condition: "Pneumonia",          ward: "General",    admittedDate: "2024-11-04", status: "admitted",    doctor: "Dr. Gupta" },
  { id: "P010", name: "James Wright",      age: 67, gender: "Male",   bloodType: "AB-", condition: "COPD",               ward: "ICU",        admittedDate: "2024-10-27", status: "critical",    doctor: "Dr. Sharma" },
  { id: "P011", name: "Keiko Watanabe",    age: 31, gender: "Female", bloodType: "O-",  condition: "Appendicitis",       ward: "Emergency",  admittedDate: "2024-11-06", status: "admitted",    doctor: "Dr. Tanaka" },
  { id: "P012", name: "Luca Bianchi",      age: 49, gender: "Male",   bloodType: "B+",  condition: "Hernia",             ward: "General",    admittedDate: "2024-11-01", status: "discharged",  doctor: "Dr. Torres" },
  { id: "P013", name: "Maria Santos",      age: 76, gender: "Female", bloodType: "A+",  condition: "Hip Fracture",       ward: "Outpatient", admittedDate: "2024-11-03", status: "observation", doctor: "Dr. Klein" },
  { id: "P014", name: "Nour Khalil",       age: 22, gender: "Female", bloodType: "O+",  condition: "Anemia",             ward: "General",    admittedDate: "2024-11-07", status: "admitted",    doctor: "Dr. Gupta" },
  { id: "P015", name: "Oscar Fernandez",   age: 53, gender: "Male",   bloodType: "AB+", condition: "Hypertension",       ward: "Outpatient", admittedDate: "2024-11-08", status: "observation", doctor: "Dr. Sharma" },
  { id: "P016", name: "Priya Mehta",       age: 44, gender: "Female", bloodType: "B-",  condition: "Thyroid Disorder",   ward: "General",    admittedDate: "2024-11-05", status: "admitted",    doctor: "Dr. Svensson" },
  { id: "P017", name: "Quan Nguyen",       age: 60, gender: "Male",   bloodType: "O+",  condition: "Diabetes Type 2",    ward: "Outpatient", admittedDate: "2024-11-04", status: "discharged",  doctor: "Dr. Tanaka" },
  { id: "P018", name: "Rosa Kim",          age: 36, gender: "Female", bloodType: "A-",  condition: "Gallstones",         ward: "General",    admittedDate: "2024-11-02", status: "admitted",    doctor: "Dr. Torres" },
  { id: "P019", name: "Samuel Okafor",     age: 70, gender: "Male",   bloodType: "B+",  condition: "Heart Failure",      ward: "ICU",        admittedDate: "2024-10-29", status: "critical",    doctor: "Dr. Klein" },
  { id: "P020", name: "Tina Hoffmann",     age: 28, gender: "Female", bloodType: "AB+", condition: "Fracture",           ward: "Emergency",  admittedDate: "2024-11-06", status: "discharged",  doctor: "Dr. Gupta" },
  { id: "P021", name: "Umar Sheikh",       age: 47, gender: "Male",   bloodType: "O-",  condition: "Ulcer",              ward: "General",    admittedDate: "2024-11-01", status: "admitted",    doctor: "Dr. Sharma" },
  { id: "P022", name: "Vera Ivanova",      age: 59, gender: "Female", bloodType: "A+",  condition: "Arthritis",          ward: "Outpatient", admittedDate: "2024-11-03", status: "observation", doctor: "Dr. Svensson" },
  { id: "P023", name: "Wei Zhang",         age: 33, gender: "Male",   bloodType: "B+",  condition: "Asthma",             ward: "General",    admittedDate: "2024-11-07", status: "admitted",    doctor: "Dr. Tanaka" },
  { id: "P024", name: "Xena Papadopoulos", age: 65, gender: "Female", bloodType: "O+",  condition: "Stroke",             ward: "ICU",        admittedDate: "2024-10-31", status: "critical",    doctor: "Dr. Torres" },
  { id: "P025", name: "Yusuf Ibrahim",     age: 52, gender: "Male",   bloodType: "A-",  condition: "Kidney Failure",     ward: "ICU",        admittedDate: "2024-10-26", status: "critical",    doctor: "Dr. Klein" },
  { id: "P026", name: "Zoe Anderson",      age: 27, gender: "Female", bloodType: "AB-", condition: "Migraine",           ward: "Outpatient", admittedDate: "2024-11-08", status: "discharged",  doctor: "Dr. Gupta" },
  { id: "P027", name: "Aaron Mitchell",    age: 43, gender: "Male",   bloodType: "B-",  condition: "Hypertension",       ward: "General",    admittedDate: "2024-11-04", status: "admitted",    doctor: "Dr. Sharma" },
  { id: "P028", name: "Bella Chen",        age: 39, gender: "Female", bloodType: "O+",  condition: "Anemia",             ward: "General",    admittedDate: "2024-11-05", status: "admitted",    doctor: "Dr. Svensson" },
  { id: "P029", name: "Carlos Mendez",     age: 61, gender: "Male",   bloodType: "A+",  condition: "COPD",               ward: "General",    admittedDate: "2024-11-02", status: "admitted",    doctor: "Dr. Tanaka" },
  { id: "P030", name: "Diana Popescu",     age: 74, gender: "Female", bloodType: "AB+", condition: "Hip Fracture",       ward: "Outpatient", admittedDate: "2024-11-03", status: "observation", doctor: "Dr. Torres" },
  { id: "P031", name: "Ethan Brooks",      age: 35, gender: "Male",   bloodType: "O-",  condition: "Appendicitis",       ward: "Emergency",  admittedDate: "2024-11-07", status: "discharged",  doctor: "Dr. Klein" },
  { id: "P032", name: "Fatima Hassan",     age: 48, gender: "Female", bloodType: "B+",  condition: "Thyroid Disorder",   ward: "General",    admittedDate: "2024-11-01", status: "admitted",    doctor: "Dr. Gupta" },
  { id: "P033", name: "George Carter",     age: 57, gender: "Male",   bloodType: "A-",  condition: "Diabetes Type 2",    ward: "Outpatient", admittedDate: "2024-11-06", status: "observation", doctor: "Dr. Sharma" },
  { id: "P034", name: "Hana Yamada",       age: 30, gender: "Female", bloodType: "O+",  condition: "Pneumonia",          ward: "General",    admittedDate: "2024-11-04", status: "admitted",    doctor: "Dr. Svensson" },
  { id: "P035", name: "Ivan Petrov",       age: 66, gender: "Male",   bloodType: "AB-", condition: "Heart Failure",      ward: "ICU",        admittedDate: "2024-10-28", status: "critical",    doctor: "Dr. Tanaka" },
  { id: "P036", name: "Julia Novak",       age: 42, gender: "Female", bloodType: "B-",  condition: "Gallstones",         ward: "General",    admittedDate: "2024-11-05", status: "admitted",    doctor: "Dr. Torres" },
  { id: "P037", name: "Karl Weber",        age: 71, gender: "Male",   bloodType: "O+",  condition: "Stroke",             ward: "ICU",        admittedDate: "2024-10-29", status: "critical",    doctor: "Dr. Klein" },
  { id: "P038", name: "Lily Thompson",     age: 26, gender: "Female", bloodType: "A+",  condition: "Fracture",           ward: "Emergency",  admittedDate: "2024-11-08", status: "discharged",  doctor: "Dr. Gupta" },
  { id: "P039", name: "Mo Diallo",         age: 54, gender: "Male",   bloodType: "AB+", condition: "Ulcer",              ward: "General",    admittedDate: "2024-11-02", status: "admitted",    doctor: "Dr. Sharma" },
  { id: "P040", name: "Nina Johanson",     age: 37, gender: "Female", bloodType: "O-",  condition: "Arthritis",          ward: "Outpatient", admittedDate: "2024-11-03", status: "observation", doctor: "Dr. Svensson" },
  { id: "P041", name: "Oliver Sato",       age: 50, gender: "Male",   bloodType: "B+",  condition: "Hernia",             ward: "General",    admittedDate: "2024-11-01", status: "admitted",    doctor: "Dr. Tanaka" },
  { id: "P042", name: "Paula Greco",       age: 78, gender: "Female", bloodType: "A-",  condition: "Kidney Failure",     ward: "ICU",        admittedDate: "2024-10-27", status: "critical",    doctor: "Dr. Torres" },
  { id: "P043", name: "Ravi Sharma",       age: 46, gender: "Male",   bloodType: "O+",  condition: "Hypertension",       ward: "General",    admittedDate: "2024-11-06", status: "admitted",    doctor: "Dr. Klein" },
  { id: "P044", name: "Sofia Andrade",     age: 32, gender: "Female", bloodType: "AB+", condition: "Asthma",             ward: "Emergency",  admittedDate: "2024-11-07", status: "discharged",  doctor: "Dr. Gupta" },
  { id: "P045", name: "Tom Eriksson",      age: 64, gender: "Male",   bloodType: "B-",  condition: "COPD",               ward: "General",    admittedDate: "2024-11-03", status: "admitted",    doctor: "Dr. Sharma" },
  { id: "P046", name: "Uma Krishnan",      age: 40, gender: "Female", bloodType: "O+",  condition: "Anemia",             ward: "General",    admittedDate: "2024-11-04", status: "admitted",    doctor: "Dr. Svensson" },
  { id: "P047", name: "Victor Blanc",      age: 56, gender: "Male",   bloodType: "A+",  condition: "Gallstones",         ward: "Outpatient", admittedDate: "2024-11-05", status: "observation", doctor: "Dr. Tanaka" },
  { id: "P048", name: "Wendy Larsson",     age: 69, gender: "Female", bloodType: "AB-", condition: "Hip Fracture",       ward: "Outpatient", admittedDate: "2024-11-02", status: "observation", doctor: "Dr. Torres" },
  { id: "P049", name: "Xander Botha",      age: 23, gender: "Male",   bloodType: "O-",  condition: "Fracture",           ward: "Emergency",  admittedDate: "2024-11-08", status: "discharged",  doctor: "Dr. Klein" },
  { id: "P050", name: "Yuki Suzuki",       age: 51, gender: "Female", bloodType: "B+",  condition: "Thyroid Disorder",   ward: "General",    admittedDate: "2024-11-01", status: "admitted",    doctor: "Dr. Gupta" },
  { id: "P051", name: "Zaid Al-Rashid",    age: 59, gender: "Male",   bloodType: "A-",  condition: "Kidney Stones",      ward: "General",    admittedDate: "2024-11-03", status: "admitted",    doctor: "Dr. Sharma" },
  { id: "P052", name: "Amara Osei",        age: 44, gender: "Female", bloodType: "O+",  condition: "Diabetes Type 2",    ward: "Outpatient", admittedDate: "2024-11-06", status: "observation", doctor: "Dr. Svensson" },
  { id: "P053", name: "Blake Harrison",    age: 38, gender: "Male",   bloodType: "AB+", condition: "Ulcer",              ward: "General",    admittedDate: "2024-11-07", status: "admitted",    doctor: "Dr. Tanaka" },
  { id: "P054", name: "Celine Dubois",     age: 73, gender: "Female", bloodType: "B-",  condition: "Stroke",             ward: "ICU",        admittedDate: "2024-10-30", status: "critical",    doctor: "Dr. Torres" },
  { id: "P055", name: "Derek Owusu",       age: 62, gender: "Male",   bloodType: "O-",  condition: "Heart Failure",      ward: "ICU",        admittedDate: "2024-10-28", status: "critical",    doctor: "Dr. Klein" },
  { id: "P056", name: "Elif Yildiz",       age: 35, gender: "Female", bloodType: "A+",  condition: "Appendicitis",       ward: "Emergency",  admittedDate: "2024-11-05", status: "admitted",    doctor: "Dr. Gupta" },
  { id: "P057", name: "Franz Gruber",      age: 48, gender: "Male",   bloodType: "AB-", condition: "Hernia",             ward: "General",    admittedDate: "2024-11-04", status: "admitted",    doctor: "Dr. Sharma" },
  { id: "P058", name: "Gina Rossi",        age: 55, gender: "Female", bloodType: "B+",  condition: "Arthritis",          ward: "Outpatient", admittedDate: "2024-11-02", status: "observation", doctor: "Dr. Svensson" },
  { id: "P059", name: "Hamid Rezaei",      age: 67, gender: "Male",   bloodType: "O+",  condition: "Pneumonia",          ward: "General",    admittedDate: "2024-11-01", status: "admitted",    doctor: "Dr. Tanaka" },
  { id: "P060", name: "Ingrid Berg",       age: 29, gender: "Female", bloodType: "A-",  condition: "Migraine",           ward: "Outpatient", admittedDate: "2024-11-08", status: "discharged",  doctor: "Dr. Torres" },
];

// ---------------------------------------------------------------------------
// Mock server API
// ---------------------------------------------------------------------------

/** Shape of the server response */
interface FetchResult {
  rows: Patient[];
  /** Total matching rows (before pagination) — used to compute pageCount */
  totalCount: number;
}

/**
 * Simulates a server-side API call.
 * In production, replace this with a real fetch / axios / React Query call.
 *
 * Applies globalFilter → columnFilters → sorting → pagination in that order,
 * mirroring typical SQL: WHERE → ORDER BY → LIMIT/OFFSET.
 *
 * @param state - Current table state (from `useServerDataTable`)
 * @returns Promise resolving to the matching page of rows and total count.
 */
async function mockFetchPatients(state: ServerTableState): Promise<FetchResult> {
  // Simulate network latency
  await new Promise<void>((r) => setTimeout(r, 350));

  let rows = [...FULL_DATASET];

  // ── Global search ──────────────────────────────────────────────────────────
  if (state.globalFilter) {
    const term = state.globalFilter.toLowerCase();
    rows = rows.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.condition.toLowerCase().includes(term) ||
      p.doctor.toLowerCase().includes(term),
    );
  }

  // ── Column filters ─────────────────────────────────────────────────────────
  for (const filter of state.columnFilters) {
    const value = filter.value as string;
    rows = rows.filter((p) => {
      const cell = String((p as unknown as Record<string, unknown>)[filter.id] ?? "");
      return cell.toLowerCase().includes(value.toLowerCase());
    });
  }

  // ── Sorting ────────────────────────────────────────────────────────────────
  if (state.sorting.length > 0) {
    rows.sort((a, b) => {
      for (const sort of state.sorting) {
        const aVal = (a as unknown as Record<string, unknown>)[sort.id];
        const bVal = (b as unknown as Record<string, unknown>)[sort.id];
        const cmp =
          aVal === bVal ? 0 :
          (aVal ?? "") < (bVal ?? "") ? -1 : 1;
        if (cmp !== 0) return sort.desc ? -cmp : cmp;
      }
      return 0;
    });
  }

  const totalCount = rows.length;

  // ── Pagination ─────────────────────────────────────────────────────────────
  const { pageIndex, pageSize } = state.pagination;
  rows = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  return { rows, totalCount };
}

// ---------------------------------------------------------------------------
// Status + ward badge styling
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<
  Patient["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  admitted:    "default",
  discharged:  "secondary",
  critical:    "destructive",
  observation: "outline",
};

const STATUS_LABEL: Record<Patient["status"], string> = {
  admitted:    "Admitted",
  discharged:  "Discharged",
  critical:    "Critical",
  observation: "Observation",
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDef<Patient>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("id")}
      </span>
    ),
    enableSorting: false,
    meta: { label: "ID" },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Patient" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
    meta: { label: "Patient" },
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Age" />
    ),
    meta: { label: "Age" },
  },
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Gender" />
    ),
    meta: { label: "Gender" },
  },
  {
    accessorKey: "bloodType",
    header: "Blood",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold">
        {row.getValue("bloodType")}
      </span>
    ),
    enableSorting: false,
    meta: { label: "Blood Type" },
  },
  {
    accessorKey: "condition",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Condition" />
    ),
    meta: { label: "Condition" },
  },
  {
    accessorKey: "ward",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Ward" />
    ),
    meta: { label: "Ward" },
  },
  {
    accessorKey: "admittedDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Admitted" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.getValue<string>("admittedDate")).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" },
        )}
      </span>
    ),
    meta: { label: "Admitted Date" },
  },
  {
    accessorKey: "doctor",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Doctor" />
    ),
    meta: { label: "Doctor" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const s = row.getValue<Patient["status"]>("status");
      return (
        <Badge variant={STATUS_VARIANT[s]}>
          {STATUS_LABEL[s]}
        </Badge>
      );
    },
    meta: { label: "Status" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const actions: RowAction<Patient>[] = [
        { label: "View",   icon: Eye,    onClick: (r) => toast.info(`Viewing ${r.original.name}`) },
        { label: "Edit",   icon: Pencil, onClick: (r) => toast(`Editing ${r.original.name}`),
          disabled: (r) => r.original.status === "discharged" || r.original.status === "critical" },
      ];
      return <DataTableRowActions row={row} actions={actions} />;
    },
    enableSorting: false,
    enableHiding: false,
    meta: { exportable: false },
  },
];

// ---------------------------------------------------------------------------
// Searchable columns for the column-scope dropdown
// ---------------------------------------------------------------------------

const SEARCHABLE_COLUMNS: SearchableColumn[] = [
  { id: "name",      label: "Patient Name" },
  { id: "condition", label: "Condition" },
  { id: "doctor",    label: "Doctor" },
];


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Demonstrates `useServerDataTable` with a simulated async API.
 *
 * Key behaviours to notice:
 * - Changing the page, sort, or search triggers a new "fetch" (visible via
 *   the loading skeleton overlaid on the previous results).
 * - Changing filters or global search resets the page to 0 automatically.
 * - The toolbar's column-scope selector restricts the global search to the
 *   chosen fields — the same pattern as CustomToolbarExample.
 *
 * To use with a real API, replace the `useEffect` block with a React Query
 * `useQuery` call, passing `state` as the query key.
 */
export function ServerTableExample() {
  // ── Server state ───────────────────────────────────────────────────────────
  const [serverRows, setServerRows] = React.useState<Patient[]>([]);
  const [pageCount, setPageCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  // ── Column-scoped search ref (same pattern as CustomToolbarExample) ────────
  const searchColumnsRef = React.useRef<Set<string>>(
    new Set(SEARCHABLE_COLUMNS.map((c) => c.id)),
  );
  /**
   * Stable getter for the current column-scope Set. Avoids passing the React
   * ref directly into useMemo (React compiler "ref access during render" check).
   */
  const getSearchColumns = React.useCallback(
    () => searchColumnsRef.current,
    [],
  );
  const columnSearchFn = React.useMemo(
    () => createColumnSearchFilterFn<Patient>(getSearchColumns),
    [getSearchColumns],
  );
  const onColumnIdsChange = React.useCallback((ids: string[]) => {
    searchColumnsRef.current = new Set(ids);
  }, []);

  // ── Table setup ────────────────────────────────────────────────────────────
  // Must be defined before onExportAll so state/table are available in scope.
  const { table, state, resetPage } = useServerDataTable({
    columns: COLUMNS,
    data: serverRows,
    pageCount,
    initialPageSize: 8,
    globalFilterFn: columnSearchFn,
  });

  // ── Export all rows from server ────────────────────────────────────────────
  /**
   * Fetches ALL matching rows (bypasses pagination) and exports them.
   * On a real backend, replace the mockFetchPatients call with an API call
   * that ignores pagination, e.g.:
   *   `api.getPatients({ ...state, pagination: { pageIndex: 0, pageSize: 99999 } })`
   *
   * @param format - The export format selected by the user.
   */
  const onExportAll = React.useCallback(
    async (format: ExportFormat, cols: ExportColumn[]) => {
      // Fetch every matching row — same filters/sort, no pagination limit
      const allState: ServerTableState = {
        ...state,
        pagination: { pageIndex: 0, pageSize: FULL_DATASET.length },
      };
      const { rows } = await mockFetchPatients(allState);
      // Map raw Patient objects to ExportRow using the dialog-selected column ids
      const exportRows = rows.map((r) =>
        Object.fromEntries(cols.map((c) => [c.id, (r as unknown as Record<string, unknown>)[c.id]])),
      );
      await exportTable(format, exportRows, cols, "patients-all", "Patients");
    },
    [state],
  );

  // ── Data fetching ──────────────────────────────────────────────────────────
  // This useEffect pattern works with plain fetch, axios, or any async fn.
  // To switch to React Query, replace this block with:
  //
  //   const { data, isFetching } = useQuery({
  //     queryKey: ["patients", state],
  //     queryFn: () => mockFetchPatients(state),
  //     placeholderData: keepPreviousData,
  //   });
  //
  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    mockFetchPatients(state).then(({ rows, totalCount: count }) => {
      if (cancelled) return; // ignore stale responses
      setServerRows(rows);
      setTotalCount(count);
      setPageCount(Math.ceil(count / state.pagination.pageSize));
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  // Re-fetch whenever any server-relevant state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sorting, state.columnFilters, state.pagination, state.globalFilter]);

  // Reset to page 0 when filters or search term change (not on page changes)
  const prevFiltersRef = React.useRef({
    sorting: state.sorting,
    columnFilters: state.columnFilters,
    globalFilter: state.globalFilter,
  });
  React.useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.sorting !== state.sorting ||
      prev.columnFilters !== state.columnFilters ||
      prev.globalFilter !== state.globalFilter
    ) {
      resetPage();
      prevFiltersRef.current = {
        sorting: state.sorting,
        columnFilters: state.columnFilters,
        globalFilter: state.globalFilter,
      };
    }
  // resetPage is stable, state refs change on user interaction
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sorting, state.columnFilters, state.globalFilter]);

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">Server-Side Table</h2>
        <p className="text-sm text-muted-foreground">
          Pagination, sorting, and search are handled server-side. Only the
          current page of rows is loaded. Simulates a 60-row dataset with
          ~350 ms network delay.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 p-1">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/*
             * Scoped search — same component as CustomToolbarExample.
             * For server-side tables, the globalFilter string is forwarded
             * to the mock API's WHERE clause (or your real query param).
             */}
            <DataTableColumnSearch
              table={table}
              searchableColumns={SEARCHABLE_COLUMNS}
              onColumnIdsChange={onColumnIdsChange}
              placeholder="Search patients..."
            />

            {/* Multi-column sort builder */}
            <DataTableSortList table={table} />
          </div>

          <div className="flex items-center gap-2">
            {/* Live row count from the server */}
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                {totalCount} patient{totalCount !== 1 ? "s" : ""}
              </span>
            )}
            {/*
             * Export current page (filtered rows) or all server rows.
             * onExportAll fetches the full matching dataset before exporting.
             */}
            <DataTableExportButton
              table={table}
              filename="patients"
              onExportAll={onExportAll}
            />
            <DataTableViewOptions table={table} />
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        {/*
         * DataTable handles skeleton rows (loading prop) and empty state
         * natively — no need for a hand-rolled <table> anymore.
         */}
        <DataTable
          table={table}
          loading={isLoading}
          loadingRowCount={state.pagination.pageSize}
          pageSizeOptions={[5, 8, 10, 20]}
          emptyState={
            <div className="flex flex-col items-center gap-3 py-12">
              <SearchX className="size-9 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium">No patients found</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Try adjusting your search term or filters.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  table.resetColumnFilters();
                  table.setGlobalFilter(undefined);
                }}
              >
                Clear search
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
