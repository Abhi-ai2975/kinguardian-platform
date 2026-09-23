/**
 * DoctorDashboard — main doctor portal dashboard component.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Two-panel layout:
 *   Left  (280px sticky) — TodayAppointmentList: today's appointments; click to select.
 *   Right (flex-1)       — Detail cards for the selected appointment:
 *                            IntakeInsights (if pre-appointment intake exists)
 *                            ConsultationInsights (if completed consultation exists)
 *                            TreatmentEngine (if assessment_plan data exists)
 *
 * When the doctor clicks an appointment in the left panel, the dashboard
 * lazy-fetches intake and consultation data for that appointment ID via server
 * actions (called from the client via useEffect + useTransition).
 *
 * Mirrors drgodly-mvp Dashboard.tsx in overall UX and card grid layout.
 */

"use client";

import { useState, useEffect, useTransition } from "react";
import { CalendarDays, ClipboardList, Loader2, MousePointerClick } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TodayAppointmentList } from "./TodayAppointmentList";
import { ConsultationInsights } from "./ConsultationInsights";
import { TreatmentEngine } from "./TreatmentEngine";
import { IntakeInsights } from "../intake/IntakeInsights";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TConsultationResponse } from "@/modules/entities/schemas/consultation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoctorDashboardProps {
  /** Today's appointments scoped to this practitioner. */
  appointments: TAppointmentResponse[];
  /** Doctor display name for the welcome heading. */
  doctorName: string;
  /** Today's date formatted for display. */
  todayLabel: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Doctor portal dashboard — appointment list + selected appointment detail cards.
 *
 * @param appointments - Today's appointment list from the server page.
 * @param doctorName - Practitioner display name.
 * @param todayLabel - Formatted date string for the header.
 */
export function DoctorDashboard({
  appointments,
  doctorName,
  todayLabel,
}: DoctorDashboardProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    appointments[0]?.id ?? null,
  );
  const [consultation, setConsultation] = useState<
    TConsultationResponse | null | undefined
  >(undefined); // undefined = loading / not yet fetched
  const [isPending, startTransition] = useTransition();

  /* ── Fetch consultation whenever selection changes ── */
  useEffect(() => {
    if (selectedId === null) {
      setConsultation(null);
      return;
    }

    setConsultation(undefined); // trigger loading state

    startTransition(async () => {
      const [data] = await getConsultationByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: selectedId },
      });
      setConsultation(data ?? null);
    });
  }, [selectedId]);

  const assessmentPlan = consultation?.full_report?.assessment_plan as
    | Record<string, unknown>
    | undefined;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1 pb-4">
        <div>
          <h1 className="text-xl font-semibold">
            Good {getGreeting()}, Dr. {doctorName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <span>
              <strong className="text-foreground">{appointments.length}</strong>{" "}
              appointment{appointments.length !== 1 ? "s" : ""} today
            </span>
          </div>

          {/*
           * In-app entry point to Clinical Records. The doctor sidebar is built
           * from the Bezs menu service rather than this repo, so this link is
           * what makes the section reachable until a menu entry is added there.
           */}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/bezs/telemedicine/doctor/clinical-records">
              <ClipboardList className="size-4" />
              Clinical Records
            </Link>
          </Button>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* ── Two-panel body ── */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* ── Left: appointment list ── */}
        <div className="w-[272px] shrink-0 border rounded-xl overflow-hidden bg-card flex flex-col">
          <div className="px-3 py-2.5 border-b shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Today&apos;s Schedule
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <TodayAppointmentList
              appointments={appointments}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* ── Right: detail cards ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {selectedId === null ? (
            <EmptySelection />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
              {/* Intake insights — self-fetching component */}
              <IntakeInsights fhirAppointmentId={selectedId} />

              {/* Consultation insights */}
              {isPending || consultation === undefined ? (
                <ConsultationLoadingCard />
              ) : consultation ? (
                <>
                  <ConsultationInsights consultation={consultation} />
                  {assessmentPlan && (
                    <TreatmentEngine assessmentPlan={assessmentPlan} />
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

/** Empty state shown when no appointment is selected. */
function EmptySelection() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <MousePointerClick className="size-8 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Select an appointment
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Click a patient from the schedule to view clinical details.
        </p>
      </div>
    </div>
  );
}

/** Skeleton loading state while consultation is being fetched. */
function ConsultationLoadingCard() {
  return (
    <div className="border rounded-xl p-6 flex items-center justify-center gap-2 text-muted-foreground text-sm bg-card">
      <Loader2 className="size-4 animate-spin" />
      Loading consultation data…
    </div>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Returns a time-appropriate greeting string. */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
