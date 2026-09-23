/**
 * DoctorAppointmentsTable — client-side appointments list for the doctor portal.
 *
 * Layer: client / telemedicine / doctor / appointments / list
 *
 * Renders the org-scoped appointment list for a practitioner using the shared
 * TanStack Table v8 system. Server-side pagination, client-side status/patient
 * filters.
 *
 * Mutation flow:
 *  - Confirm / Cancel / Delete: row action callbacks open the matching modal
 *    via the doctor Zustand store. The modals (ConfirmAppointmentModal,
 *    CancelAppointmentModal, DeleteAppointmentModal) handle the server action
 *    and cache invalidation.
 *
 * Pattern source: OrganizationsTable.tsx (useServerDataTable + useQuery + two-state seeding).
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
import {
  type TAppointmentResponse,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import {
  doctorAppointmentKeys,
  fetchDoctorAppointments,
} from "./appointmentQueries";
import { createDoctorAppointmentColumns } from "./DoctorAppointmentColumns";
import { AppointmentDetailPanel } from "@/modules/client/telemedicine/shared/components/appointment/AppointmentDetailPanel";
import { doctorStore } from "@/modules/client/telemedicine/doctor/stores/doctor.store";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size for the doctor appointment list. */
const INITIAL_PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Props accepted by DoctorAppointmentsTable. */
interface DoctorAppointmentsTableProps {
  /**
   * SSR-fetched first page — seeds the table immediately to avoid a
   * loading flash on navigation. Subsequent pages are fetched client-side.
   */
  initialData: TPaginatedAppointmentResponse;
  /** Active organisation ID from the server session, used to scope the list query. */
  orgId: string | null;
  /**
   * FHIR Practitioner.id (integer) of the logged-in doctor.
   * When present, the list is scoped to only appointments where this
   * practitioner is a participant. Null falls back to org-wide listing.
   */
  practitionerId: number | null;
  /** Localised base href for appointment detail pages (e.g. /en/…/appointments). */
  viewHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client-side doctor appointments table.
 *
 * Accepts an SSR-seeded initial page and re-fetches on pagination changes.
 * Row actions (View, Confirm, Cancel, Delete) delegate to router.push or the
 * doctor Zustand store — no local dialog state or mutation logic lives here.
 *
 * @param initialData - First-page data fetched on the server.
 * @param orgId - Active organisation ID for scoping the list query.
 * @param practitionerId - FHIR Practitioner.id to scope appointments to this doctor.
 * @param viewHref - Base href for the appointment detail page.
 */
export function DoctorAppointmentsTable({
  initialData,
  orgId,
  practitionerId,
  viewHref,
}: DoctorAppointmentsTableProps) {
  const router = useRouter();

  // ── Row + page count state (seeded from SSR, synced from client query) ──────
  const [rows, setRows] = useState<TAppointmentResponse[]>(initialData.data ?? []);
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  // ── Column definitions (memo-stable) ────────────────────────────────────────
  const columns = useMemo(
    () =>
      createDoctorAppointmentColumns({
        onView: (row) => router.push(`${viewHref}/${row.id}`),
        onConfirm: (row) =>
          doctorStore.getState().onOpen({
            type: "confirmAppointment",
            data: { appointment: row },
          }),
        onCancel: (row) =>
          doctorStore.getState().onOpen({
            type: "cancelAppointment",
            data: { appointment: row },
          }),
        onReschedule: (row) =>
          doctorStore.getState().onOpen({
            type: "rescheduleAppointment",
            data: { appointment: row },
          }),
        // Navigates to the virtual consultation room for this appointment.
        // The page reads ?appointmentId to fetch the LiveKit room_id.
        onConsult: (row) =>
          router.push(`${viewHref}/online-consultation?appointmentId=${row.id}`),
        // Navigates to the in-person diarization recording screen for this appointment.
        onInPersonConsult: (row) =>
          router.push(`${viewHref}/inperson-consultation?appointmentId=${row.id}`),
        // Navigates to the post-consultation review page for this appointment.
        onReview: (row) => router.push(`${viewHref}/${row.id}/review`),
      }),
    [router, viewHref],
  );

  // ── TanStack Table ───────────────────────────────────────────────────────────
  const { table, state, resetPage } = useServerDataTable({
    columns,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    // Every appointment carries detail worth expanding into, so no row is
    // excluded — the panel hides its own empty sections.
    getRowCanExpand: () => true,
  });

  // Extract server-side filter params from the column filter state.
  // multiSelect returns string[] — we take the first value since the API
  // accepts a single status code. undefined means "no filter" (all statuses).
  const statusFilter = state.columnFilters.find((f) => f.id === "status")
    ?.value as string[] | undefined;
  const activeStatus = statusFilter?.[0];

  // Reset to page 0 whenever the status filter changes so stale page indices
  // don't produce empty results after filtering.
  useEffect(() => {
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus]);

  // ── Server query ─────────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: doctorAppointmentKeys.list({
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      orgId,
      practitionerId,
      status: activeStatus,
    }),
    queryFn: () =>
      fetchDoctorAppointments({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
        orgId,
        practitionerId,
        status: activeStatus,
      }),
    // Only seed the SSR data for the exact initial query (no filter, page 0).
    // Any other key (filtered, paginated) must always fetch — if we pass
    // initialData for every key, TanStack marks filtered keys "fresh" with the
    // wrong unfiltered data and skips the fetch entirely for staleTime duration.
    initialData:
      !activeStatus && state.pagination.pageIndex === 0 ? initialData : undefined,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // Sync table rows whenever a new page or filter result arrives
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
    <DataTable
      table={table}
      loading={isFetching}
      renderSubComponent={(row) => (
        <AppointmentDetailPanel row={row} perspective="doctor" />
      )}
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
