/**
 * PatientAppointmentsTable — client-side appointments list for the patient portal.
 *
 * Layer: client / telemedicine / patient / appointments / list
 *
 * Renders the patient's own appointment history and upcoming appointments using
 * the shared TanStack Table v8 system. Server-side pagination with client-side
 * status/doctor filters.
 *
 * Mutation flow:
 *  - Cancel / Delete: row action callbacks open the matching modal via the
 *    patient Zustand store. The modals (CancelAppointmentModal,
 *    DeleteAppointmentModal) handle the server action and cache invalidation.
 *
 * Pattern source: OrganizationsTable.tsx (useServerDataTable + useQuery + two-state seeding).
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  patientAppointmentKeys,
  fetchMyAppointments,
} from "./appointmentQueries";
import { createPatientAppointmentColumns } from "./PatientAppointmentColumns";
import { AppointmentDetailPanel } from "@/modules/client/telemedicine/shared/components/appointment/AppointmentDetailPanel";
import { patientStore } from "@/modules/client/telemedicine/patient/stores/patient.store";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size for the patient appointment list. */
const INITIAL_PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Props accepted by PatientAppointmentsTable. */
interface PatientAppointmentsTableProps {
  /**
   * SSR-fetched first page — seeds the table immediately to avoid a
   * loading flash on navigation. Subsequent pages are fetched client-side.
   */
  initialData: TPaginatedAppointmentResponse;
  /** Localised href for the manual booking wizard (e.g. /en/…/appointments/book). */
  bookHref: string;
  /** Localised href for the intake chooser (e.g. /en/…/intake). */
  intakeHref: string;
  /** Localised base href for appointment detail pages (e.g. /en/…/appointments). */
  viewHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client-side patient appointments table.
 *
 * Accepts an SSR-seeded initial page and re-fetches on pagination changes.
 * Row actions (View, Cancel, Delete) delegate to router.push or the patient
 * Zustand store — no local dialog state or mutation logic lives here.
 *
 * @param initialData - First-page data fetched on the server.
 * @param bookHref - Localised href for the "Book Appointment" modal trigger.
 * @param intakeHref - Localised href for the AI intake flow.
 * @param viewHref - Base href for the appointment detail page.
 */
export function PatientAppointmentsTable({
  initialData,
  bookHref,
  intakeHref,
  viewHref,
}: PatientAppointmentsTableProps) {
  const router = useRouter();

  // ── Row + page count state (seeded from SSR, synced from client query) ──────
  const [rows, setRows] = useState<TAppointmentResponse[]>(initialData.data ?? []);
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  // ── Column definitions (memo-stable) ────────────────────────────────────────
  const columns = useMemo(
    () =>
      createPatientAppointmentColumns({
        onView: (row) => router.push(`${viewHref}/${row.id}`),
        onCancel: (row) =>
          patientStore.getState().onOpen({
            type: "cancelAppointment",
            data: { appointment: row },
          }),
        onReschedule: (row) =>
          patientStore.getState().onOpen({
            type: "rescheduleAppointment",
            data: { appointment: row },
          }),
        // Navigates to the virtual consultation room for this appointment.
        // The page reads ?appointmentId to fetch the LiveKit room_id.
        onConsult: (row) =>
          router.push(`${viewHref}/online-consultation?appointmentId=${row.id}`),
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
    queryKey: patientAppointmentKeys.list({
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      status: activeStatus,
    }),
    queryFn: () =>
      fetchMyAppointments({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
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
        <AppointmentDetailPanel row={row} perspective="patient" />
      )}
    >
      <DataTableToolbar table={table}>
        {/* Opens the booking method chooser dialog via the patient store */}
        <Button
          size="sm"
          className="ml-auto"
          onClick={() =>
            patientStore.getState().onOpen({
              type: "bookAppointment",
              data: { bookHref, intakeHref },
            })
          }
        >
          <CalendarPlus className="size-4 mr-1.5" />
          Book Appointment
        </Button>
      </DataTableToolbar>
    </DataTable>
  );
}
