/**
 * PatientAppointmentsTable — step 2 of the doctor's Clinical Records
 * drill-down: every appointment with the selected patient, filterable,
 * paginated, and switchable between a card grid and a table.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Pure server-side pagination: every page turn, status pick, or date-range
 * change re-fetches through fetchPatientAppointments (a ZSA action inside
 * useQuery — the same pattern DoctorAppointmentsTable uses for the org
 * appointment list). No more than one page of rows is ever held in memory or
 * filtered client-side.
 *
 * The card design is unchanged — AppointmentRecordCard is the same markup the
 * former all-at-once list used — so the default view still reads exactly as
 * it did. Grid stays the default view: a doctor scanning a patient's history
 * is reading visits, not comparing columns.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  DataTableToolbar,
  DataTableWithViews,
  useServerDataTable,
} from "@/modules/client/shared/components/tables";
import { AppointmentRecordCard } from "./AppointmentRecordCard";
import { createPatientAppointmentColumns } from "./PatientAppointmentColumns";
import { endOfDay } from "./appointmentDisplay";
import {
  fetchPatientAppointments,
  patientAppointmentKeys,
} from "./patientAppointmentQueries";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size — matches the doctor org appointment list. */
const INITIAL_PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatientAppointmentsTableProps {
  /**
   * SSR-fetched first page (no filters, offset 0) — seeds the table
   * immediately so opening a patient's chart doesn't start with a spinner.
   * Every other page or filter combination is fetched client-side.
   */
  initialData: TPaginatedAppointmentResponse;
  /** FHIR Patient.id every fetch is scoped to. */
  patientId: number;
  /** Active organisation ID, forwarded to the list query. */
  orgId: string | null;
  /** FHIR Practitioner.id of the logged-in doctor, scoping the list to them. */
  practitionerId: number | null;
  /**
   * Appointment IDs that have at least one Encounter. Drives the card footer
   * and the Record column — not the destination, which is the same either way.
   */
  appointmentIdsWithEncounter: number[];
  /** Base href for the clinical workspace, e.g. ".../clinical-records/10023". */
  workspaceBaseHref: string;
  /**
   * Reference instant for the Timing column, in epoch milliseconds, resolved
   * by the server page. Passed in rather than read here so SSR and hydration
   * agree on "now" and every row is judged against the same moment.
   */
  nowMs: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Server-paginated appointment list with card and table views.
 *
 * @param initialData - First-page data fetched on the server.
 * @param patientId - FHIR Patient.id to scope the query to.
 * @param orgId - Active organisation ID for scoping the list query.
 * @param practitionerId - FHIR Practitioner.id to scope appointments to this doctor.
 * @param appointmentIdsWithEncounter - IDs that have a clinical record.
 * @param workspaceBaseHref - Base path for the Clinical Records route.
 * @param nowMs - Server-resolved "now" for the Timing column.
 */
export function PatientAppointmentsTable({
  initialData,
  patientId,
  orgId,
  practitionerId,
  appointmentIdsWithEncounter,
  workspaceBaseHref,
  nowMs,
}: PatientAppointmentsTableProps) {
  /* Set lookup — the Record column tests membership once per row per render. */
  const encounterIds = useMemo(
    () => new Set(appointmentIdsWithEncounter),
    [appointmentIdsWithEncounter],
  );

  const columns = useMemo(
    () =>
      createPatientAppointmentColumns({
        nowMs,
        encounterIds,
        workspaceBaseHref,
      }),
    [nowMs, encounterIds, workspaceBaseHref],
  );

  // ── Row + page count state (seeded from SSR, synced from client query) ──────
  const [rows, setRows] = useState<TAppointmentResponse[]>(
    initialData.data ?? [],
  );
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  /* No initialSorting: ListAppointmentsValidationSchema has no sort param, so
     manual mode has nothing to apply a sort-state arrow to — setting one here
     would show an indicator that does not reflect the server's actual order. */
  const { table, state, resetPage } = useServerDataTable({
    columns,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    getRowId: (row) => String(row.id),
  });

  // Extract server-side filter params from the column filter state.
  // Status is multiSelect in the UI but the API takes one code — send the
  // first pick only, same simplification the doctor org list makes.
  const statusFilter = state.columnFilters.find((f) => f.id === "status")
    ?.value as string[] | undefined;
  const activeStatus = statusFilter?.[0];

  const dateFilter = state.columnFilters.find((f) => f.id === "date")?.value as
    | [number | undefined, number | undefined]
    | undefined;
  const startFrom = dateFilter?.[0]
    ? new Date(dateFilter[0]).toISOString()
    : undefined;
  const startTo = dateFilter?.[1]
    ? new Date(endOfDay(dateFilter[1])).toISOString()
    : undefined;

  // Reset to page 0 whenever a filter changes so a stale page index doesn't
  // land past the end of the newly-filtered result set.
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, startFrom, startTo]);

  // ── Server query ─────────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: patientAppointmentKeys.list({
      patientId,
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      orgId,
      practitionerId,
      status: activeStatus,
      startFrom,
      startTo,
    }),
    queryFn: () =>
      fetchPatientAppointments({
        patientId,
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
        orgId,
        practitionerId,
        status: activeStatus,
        startFrom,
        startTo,
      }),
    // Only seed the SSR data for the exact initial query (no filters, page 0).
    // Seeding every key would mark filtered/paginated keys "fresh" with the
    // wrong unfiltered data and skip the fetch for staleTime's duration.
    initialData:
      !activeStatus &&
      !startFrom &&
      !startTo &&
      state.pagination.pageIndex === 0
        ? initialData
        : undefined,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // Sync table rows whenever a new page or filter result arrives.
  useEffect(() => {
    if (data) {
      setRows(data.data ?? []);
      setPageCount(Math.ceil((data.total ?? 0) / state.pagination.pageSize));
    }
  }, [data, state.pagination.pageSize]);

  /* Distinguishes "this patient has no appointments at all" from "no
     appointment matches these filters" — only knowable from the true,
     unfiltered total the SSR fetch already established. */
  if (initialData.total === 0 && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <CalendarOff className="size-10 opacity-30" />
        <p className="text-sm font-medium">No appointments with this patient.</p>
      </div>
    );
  }

  return (
    <DataTableWithViews
      table={table}
      defaultView="grid"
      gridClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
      loading={isFetching}
      toolbar={<DataTableToolbar table={table} />}
      renderCard={(row) => (
        <AppointmentRecordCard
          appointment={row.original}
          hasEncounter={encounterIds.has(row.original.id)}
          workspaceBaseHref={workspaceBaseHref}
        />
      )}
      emptyState={
        <div className="flex flex-col items-center gap-2 py-10">
          <CalendarOff className="size-8 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            No appointments match these filters.
          </p>
        </div>
      }
    />
  );
}
