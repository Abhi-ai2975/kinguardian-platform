/**
 * ConsultationsTable — client-side AI Consultation list for the patient portal.
 *
 * Layer: client / telemedicine / patient / ai-consultation / list
 *
 * Renders the patient-scoped AI Consultation list using the shared TanStack
 * Table v8 system. Server-side pagination, client-side status filter.
 *
 * Pattern: IntakesTable (useServerDataTable + useQuery + SSR seeding).
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
  TConsultationListItem,
  TPaginatedConsultationResponse,
} from "@/modules/entities/schemas/consultation";
import {
  patientConsultationKeys,
  fetchPatientConsultations,
} from "./consultationQueries";
import { createConsultationColumns } from "./ConsultationColumns";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size — must match INITIAL_PAGE_SIZE in the server page. */
const INITIAL_PAGE_SIZE = 10;

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for ConsultationsTable. */
interface ConsultationsTableProps {
  /**
   * SSR-fetched first page — seeds the table immediately to avoid a
   * loading flash on navigation. Subsequent pages are fetched client-side.
   */
  initialData: TPaginatedConsultationResponse;
  /** Better Auth userId of the logged-in patient, used to scope the query. */
  userId: string | null;
  /** Base href for navigating to an appointment detail page. */
  appointmentViewHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client-side AI Consultation table.
 *
 * Accepts an SSR-seeded initial page and re-fetches on pagination/filter changes.
 * The "View" row action navigates to the linked appointment detail page.
 *
 * @param initialData - First-page data fetched on the server.
 * @param userId - Patient's Better Auth userId for scoping the query.
 * @param appointmentViewHref - Base href for the appointment detail page.
 */
export function ConsultationsTable({
  initialData,
  userId,
  appointmentViewHref,
}: ConsultationsTableProps) {
  const router = useRouter();

  // ── Row + page count state ───────────────────────────────────────────────────
  const [rows, setRows] = useState<TConsultationListItem[]>(
    initialData.data ?? [],
  );
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  // ── Column definitions ───────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      createConsultationColumns({
        onView: (row) => {
          /* Navigate to the appointment detail page linked to this consultation. */
          router.push(`${appointmentViewHref}/${row.fhir_appointment_id}`);
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

  /* Extract server-side filter state. */
  const statusFilter = state.columnFilters.find((f) => f.id === "status")
    ?.value as string[] | undefined;
  const activeStatus = statusFilter?.[0];

  /* Reset to page 0 when the status filter changes. */
  useEffect(() => {
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus]);

  // ── Server query ─────────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: patientConsultationKeys.list({
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      userId,
      status: activeStatus,
    }),
    queryFn: () =>
      fetchPatientConsultations({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
        userId,
        status: activeStatus,
      }),
    /* Only seed SSR data for the exact unfiltered page-0 query. */
    initialData:
      !activeStatus && state.pagination.pageIndex === 0
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
