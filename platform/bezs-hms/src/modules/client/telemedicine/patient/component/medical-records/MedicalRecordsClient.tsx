/**
 * MedicalRecordsClient — two-step interactive shell for the Medical Records page.
 *
 * Layer: client / telemedicine / patient / component / medical-records
 *
 * Step 1 — Appointment picker:
 *   Shows all fulfilled appointments newest-first. Each card shows the date,
 *   doctor name (from participant[Practitioner]), and appointment type.
 *   Patient taps a card to proceed.
 *
 * Step 2 — Orders view (after appointment selected):
 *   All FHIR data is fetched on-demand when the patient selects an appointment:
 *   1. getEncounterByAppointmentAction({ appointment_id }) → resolves encounter
 *   2. In parallel: listServiceRequestsAction({ encounter_id })
 *                 + listDiagnosticReportsAction({ encounter_id })
 *   3. Cross-references the loaded DRs to show upload state per ServiceRequest.
 *   Back button returns to Step 1.
 *
 * The UploadResultModal is already mounted in the patient layout — no extra
 * provider is needed here.
 */

"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  UserRound,
  ChevronRight,
  ClipboardX,
  CalendarOff,
  Loader2,
  Clock,
  Timer,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ServiceRequestRecordCard,
  RecordListEmptyState,
} from "./ServiceRequestRecordCard";
import { getEncounterByAppointmentAction } from "@/modules/server/presentation/actions/encounter/core.actions";
import { listServiceRequestsAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import { listDiagnosticReportsAction } from "@/modules/server/presentation/actions/diagnostic-report";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type {
  TPaginatedDiagnosticReportResponse,
} from "@/modules/entities/schemas/diagnostic-report";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TPaginatedServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TEncounterResponse } from "@/modules/entities/schemas/encounter";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO datetime as a short locale date, e.g. "Jan 5, 2025".
 * @param iso - ISO 8601 string.
 */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Formats an ISO datetime as a 12-hour clock time, e.g. "10:30 AM".
 * @param iso - ISO 8601 string.
 */
function fmtTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * Derives a human-readable duration string from start/end or minutes_duration.
 * Returns e.g. "30 min" or "1 hr 15 min".
 *
 * @param start            - ISO start datetime.
 * @param end              - ISO end datetime.
 * @param minutesDuration  - Explicit duration in minutes (fallback when end is absent).
 */
function fmtDuration(
  start: string | null | undefined,
  end: string | null | undefined,
  minutesDuration: number | null | undefined,
): string | null {
  let mins: number | null = null;

  if (start && end) {
    try {
      mins = Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) / 60000,
      );
    } catch {
      /* ignore */
    }
  }

  if (mins == null && minutesDuration != null) {
    mins = minutesDuration;
  }

  if (mins == null || mins <= 0) return null;

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/**
 * Extracts the Practitioner participant's display name from an appointment.
 * @param appt - Appointment record.
 */
function getDoctorName(appt: TAppointmentResponse): string | null {
  return (
    appt.participant?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? null
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MedicalRecordsClientProps {
  /** Fulfilled appointments for this patient (pre-fetched SSR). */
  appointments: TAppointmentResponse[];
}

// ── Step 1 — Appointment picker ───────────────────────────────────────────────

interface AppointmentPickerProps {
  appointments: TAppointmentResponse[];
  /** Called when the patient taps a card. */
  onSelect: (appt: TAppointmentResponse) => void;
}

/**
 * Lists fulfilled appointments for the patient to choose from.
 * Shows date, doctor, and appointment type on each card.
 *
 * @param appointments - Pre-fetched fulfilled appointments.
 * @param onSelect     - Callback with the chosen appointment.
 */
function AppointmentPicker({ appointments, onSelect }: AppointmentPickerProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <CalendarOff className="size-10 opacity-30" />
        <p className="text-sm font-medium text-center">
          No completed appointments yet.
        </p>
        <p className="text-xs text-center max-w-xs opacity-70">
          Completed appointment records will appear here once your doctor
          has finished your consultation.
        </p>
      </div>
    );
  }

  /* Newest first. */
  const sorted = [...appointments].sort((a, b) =>
    (b.start ?? "").localeCompare(a.start ?? ""),
  );

  return (
    <div className="space-y-3">
      {sorted.map((appt) => {
        const doctorName = getDoctorName(appt);
        const apptType =
          appt.appointment_type_display ??
          appt.appointment_type_text ??
          null;
        const startTime = fmtTime(appt.start);
        const endTime = fmtTime(appt.end);
        const duration = fmtDuration(appt.start, appt.end, appt.minutes_duration);
        const description = appt.description ?? null;

        return (
          <Card
            key={appt.id}
            className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => onSelect(appt)}
          >
            <CardContent className="px-4 py-3 flex items-start gap-4">
              {/* Left: all details */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Date — primary identifier */}
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <CalendarDays className="size-3.5 text-primary shrink-0" />
                  {fmtDate(appt.start)}
                </div>

                {/* Time + duration row */}
                {(startTime ?? duration) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {startTime && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3 shrink-0" />
                        {endTime ? `${startTime} – ${endTime}` : startTime}
                      </span>
                    )}
                    {duration && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Timer className="size-3 shrink-0" />
                        {duration}
                      </span>
                    )}
                  </div>
                )}

                {/* Doctor name */}
                {doctorName && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="size-3 shrink-0" />
                    {doctorName}
                  </div>
                )}

                {/* Appointment type */}
                {apptType && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Stethoscope className="size-3 shrink-0" />
                    {apptType}
                  </div>
                )}

                {/* Free-text description (if different from type) */}
                {description && description !== apptType && (
                  <p className="text-xs text-muted-foreground/70 truncate pl-0.5">
                    {description}
                  </p>
                )}
              </div>

              {/* Right: chevron */}
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <Badge
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  Completed
                </Badge>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Step 2 — Orders view ──────────────────────────────────────────────────────

/** Loading skeleton shown while the encounter + SR + DR fetch is in flight. */
function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="px-4 py-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Two-step Medical Records shell.
 * Step 1: appointment picker. Step 2: on-demand encounter → SR + DR fetch + upload cards.
 *
 * @param appointments - Pre-fetched fulfilled appointments (SSR).
 */
export function MedicalRecordsClient({
  appointments,
}: MedicalRecordsClientProps) {
  /** The appointment the patient selected in Step 1. */
  const [selectedAppt, setSelectedAppt] =
    useState<TAppointmentResponse | null>(null);

  /** Service requests loaded for the selected appointment's encounter. */
  const [serviceRequests, setServiceRequests] = useState<
    TServiceRequestResponse[]
  >([]);

  /**
   * Diagnostic reports loaded for the selected appointment's encounter.
   * Fetched in parallel with service requests so upload history is instant.
   */
  const [diagnosticReports, setDiagnosticReports] = useState<
    TDiagnosticReportResponse[]
  >([]);

  /** True while the encounter + SR + DR fetch is in flight. */
  const [isLoading, setIsLoading] = useState(false);

  /** Error message if the fetch chain fails. */
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Cross-reference: DR → SR ────────────────────────────────────────────

  /**
   * Map from ServiceRequest.id → DiagnosticReport[].
   * Rebuilt whenever serviceRequests or diagnosticReports change.
   */
  const drsByServiceRequestId = useMemo(() => {
    const map = new Map<number, TDiagnosticReportResponse[]>();
    for (const dr of diagnosticReports) {
      for (const ref of dr.based_on ?? []) {
        if (
          ref.reference_type === "ServiceRequest" &&
          ref.reference_id != null
        ) {
          const existing = map.get(ref.reference_id) ?? [];
          existing.push(dr);
          map.set(ref.reference_id, existing);
        }
      }
    }
    return map;
  }, [diagnosticReports]);

  // ── Appointment selection handler ───────────────────────────────────────

  /**
   * Called when the patient taps a card in Step 1.
   * On-demand fetch chain: appointment → encounter → (SRs + DRs in parallel).
   *
   * @param appt - The appointment the patient selected.
   */
  async function handleSelectAppointment(appt: TAppointmentResponse) {
    setSelectedAppt(appt);
    setServiceRequests([]);
    setDiagnosticReports([]);
    setFetchError(null);
    setIsLoading(true);

    try {
      /* 1. Resolve the encounter for this appointment via server action. */
      const [encounter, encounterErr] = (await getEncounterByAppointmentAction({
        appointment_id: appt.id,
      })) as [TEncounterResponse | null, unknown];

      if (encounterErr) {
        setFetchError("Could not load appointment record. Please try again.");
        return;
      }

      if (!encounter) {
        /* Appointment exists but no encounter was created for it yet — no orders. */
        return;
      }

      /* 2. Fetch service requests + diagnostic reports in parallel by encounter_id. */
      const [[srPage, srErr], [drPage, drErr]] = await Promise.all([
        listServiceRequestsAction({
          payload: { encounter_id: encounter.id, limit: 200 },
        }) as Promise<[TPaginatedServiceRequestResponse | null, unknown]>,
        listDiagnosticReportsAction({
          payload: { encounter_id: encounter.id, limit: 200 },
        }) as Promise<[TPaginatedDiagnosticReportResponse | null, unknown]>,
      ]);

      if (srErr) {
        setFetchError("Could not load test orders. Please try again.");
        return;
      }

      setServiceRequests(srPage?.data ?? []);
      /* DR errors are non-fatal — orders still render, upload history just won't show. */
      if (!drErr) {
        setDiagnosticReports(drPage?.data ?? []);
      }
    } catch (e) {
      console.error("[MedicalRecords] unexpected error:", e);
      setFetchError("Could not load orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /** Returns to Step 1 (appointment picker). */
  function handleBack() {
    setSelectedAppt(null);
    setServiceRequests([]);
    setDiagnosticReports([]);
    setFetchError(null);
  }

  // ── Step 2 render ───────────────────────────────────────────────────────

  if (selectedAppt) {
    const doctorName = getDoctorName(selectedAppt);
    const headerStartTime = fmtTime(selectedAppt.start);
    const headerEndTime = fmtTime(selectedAppt.end);
    const headerDuration = fmtDuration(
      selectedAppt.start,
      selectedAppt.end,
      selectedAppt.minutes_duration,
    );
    const headerType =
      selectedAppt.appointment_type_display ??
      selectedAppt.appointment_type_text ??
      selectedAppt.description ??
      null;

    return (
      <div className="space-y-4">
        {/* Back button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2 text-muted-foreground"
          onClick={handleBack}
        >
          <ArrowLeft className="size-4" />
          Back to Appointments
        </Button>

        {/* Selected appointment context header */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="px-4 py-3 flex items-start gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarDays className="size-3.5 text-primary shrink-0" />
                {fmtDate(selectedAppt.start)}
              </div>
              {(headerStartTime ?? headerDuration) && (
                <div className="flex items-center gap-3 flex-wrap">
                  {headerStartTime && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      {headerEndTime
                        ? `${headerStartTime} – ${headerEndTime}`
                        : headerStartTime}
                    </span>
                  )}
                  {headerDuration && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Timer className="size-3 shrink-0" />
                      {headerDuration}
                    </span>
                  )}
                </div>
              )}
              {doctorName && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="size-3 shrink-0" />
                  {doctorName}
                </div>
              )}
              {headerType && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Stethoscope className="size-3 shrink-0" />
                  {headerType}
                </div>
              )}
            </div>
            <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">
              Completed
            </Badge>
          </CardContent>
        </Card>

        {/* Orders section heading */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Test Orders &amp; Uploads
          </p>
        </div>

        {/* Loading */}
        {isLoading && <OrdersLoadingSkeleton />}

        {/* Error */}
        {!isLoading && fetchError && (
          <Card>
            <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
              <ClipboardX className="size-8 opacity-40" />
              <p className="text-sm">{fetchError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectAppointment(selectedAppt)}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No orders */}
        {!isLoading && !fetchError && serviceRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
            <ClipboardX className="size-10 opacity-30" />
            <p className="text-sm font-medium text-center">
              No test orders for this appointment.
            </p>
            <p className="text-xs text-center max-w-xs opacity-70">
              Your doctor did not create any test or investigation orders
              for this visit.
            </p>
          </div>
        )}

        {/* SR cards */}
        {!isLoading && !fetchError && serviceRequests.length > 0 && (
          <div className="space-y-3">
            {serviceRequests.map((sr) => (
              <ServiceRequestRecordCard
                key={sr.id}
                sr={sr}
                diagnosticReports={drsByServiceRequestId.get(sr.id) ?? []}
                appointment={selectedAppt}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Step 1 render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Section heading */}
      {appointments.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Completed Appointments
          </p>
          {isLoading && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      <AppointmentPicker
        appointments={appointments}
        onSelect={handleSelectAppointment}
      />
    </div>
  );
}
