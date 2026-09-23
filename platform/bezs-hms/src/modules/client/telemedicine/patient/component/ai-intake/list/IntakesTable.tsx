/**
 * IntakesTable — client-side AI Intake list for the patient portal.
 *
 * Layer: client / telemedicine / patient / ai-intake / list
 *
 * Renders the patient-scoped AI Intake list using the shared TanStack Table v8
 * system. Server-side pagination, client-side status/mode filters.
 *
 * Pattern: DoctorAppointmentsTable (useServerDataTable + useQuery + SSR seeding).
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DataTable,
  DataTableToolbar,
  useServerDataTable,
} from "@/modules/client/shared/components/tables";
import type {
  TIntakeResponse,
  TPaginatedIntakeResponse,
} from "@/modules/entities/schemas/intake";
import { patientIntakeKeys, fetchPatientIntakes } from "./intakeQueries";
import { createIntakeColumns } from "./IntakeColumns";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size — must match INITIAL_PAGE_SIZE in the server page. */
const INITIAL_PAGE_SIZE = 10;

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for IntakesTable. */
interface IntakesTableProps {
  /**
   * SSR-fetched first page — seeds the table immediately to avoid a
   * loading flash on navigation. Subsequent pages are fetched client-side.
   */
  initialData: TPaginatedIntakeResponse;
  /** Better Auth userId of the logged-in patient, used to scope the query. */
  userId: string | null;
  /** Base href for navigating to an appointment detail page. */
  appointmentViewHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client-side AI Intake table.
 *
 * Accepts an SSR-seeded initial page and re-fetches on pagination/filter changes.
 * The "View" row action navigates to the linked appointment (if any) or falls
 * back to the intake list since there is no standalone intake detail page.
 *
 * @param initialData - First-page data fetched on the server.
 * @param userId - Patient's Better Auth userId for scoping the query.
 * @param appointmentViewHref - Base href for the appointment detail page.
 */
export function IntakesTable({
  initialData,
  userId,
  appointmentViewHref,
}: IntakesTableProps) {
  const router = useRouter();

  // ── Row + page count state ───────────────────────────────────────────────────
  const [rows, setRows] = useState<TIntakeResponse[]>(initialData.data ?? []);
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  // ── Column definitions ───────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      createIntakeColumns({
        onView: (row) => {
          /* Navigate to the linked appointment detail page if the intake was linked. */
          if (row.fhir_appointment_id) {
            router.push(`${appointmentViewHref}/${row.fhir_appointment_id}`);
          }
          /* If not linked, there is no standalone intake detail page yet — stay. */
        },
      }),
    [router, appointmentViewHref],
  );

  // ── TanStack Table ───────────────────────────────────────────────────────────
  const { table, state, resetPage } = useServerDataTable({
    columns,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
  });

  /* Extract server-side filter state. multiSelect returns string[]. */
  const statusFilter = state.columnFilters.find((f) => f.id === "status")
    ?.value as string[] | undefined;
  const activeStatus = statusFilter?.[0];

  const modeFilter = state.columnFilters.find((f) => f.id === "mode")
    ?.value as string[] | undefined;
  const activeMode = modeFilter?.[0];

  /* Reset to page 0 when any filter changes. */
  useEffect(() => {
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, activeMode]);

  // ── Server query ─────────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: patientIntakeKeys.list({
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      userId,
      status: activeStatus,
      mode: activeMode,
    }),
    queryFn: () =>
      fetchPatientIntakes({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
        userId,
        status: activeStatus,
        mode: activeMode,
      }),
    /* Only seed SSR data for the exact unfiltered page-0 query. */
    initialData:
      !activeStatus && !activeMode && state.pagination.pageIndex === 0
        ? initialData
        : undefined,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  /* Sync table rows when a new result arrives. */
  useEffect(() => {
    if (data) {
      setRows(data.data ?? []);
      setPageCount(
        Math.ceil((data.total ?? 0) / state.pagination.pageSize),
      );
    }
  }, [data, state.pagination.pageSize]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DataTable table={table} loading={isFetching}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
