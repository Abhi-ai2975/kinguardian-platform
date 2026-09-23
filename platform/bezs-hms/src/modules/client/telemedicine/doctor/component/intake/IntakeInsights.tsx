/**
 * IntakeInsights — doctor-side panel showing pre-appointment intake data.
 *
 * Layer: client / telemedicine / doctor / intake
 *
 * Displays the patient's intake conversation transcript and AI-generated
 * clinical assessment report for a specific FHIR appointment.
 *
 * Usage: embed this in an appointment detail view, passing the FHIR
 * appointment ID. The component fetches the linked intake via
 * getIntakeByFhirAppointmentIdAction and renders:
 *   - Risk level badge
 *   - Clinical overview
 *   - Differential diagnosis list
 *   - Diagnostic + treatment plans
 *   - Red flags
 *   - Full conversation transcript (collapsed by default)
 *
 * Returns null (renders nothing) when no intake is linked to the appointment.
 */

"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getIntakeByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/intake";
import {
  flattenDiagnosticPlan,
  safeParseReport,
  type IntakeReport,
} from "@/modules/client/telemedicine/doctor/component/clinical-records/intakeReport";
import {
  DiagnosticPlanField,
  DifferentialDiagnosisList,
  RedFlagList,
  TreatmentPlanField,
} from "@/modules/client/telemedicine/doctor/component/clinical-records/IntakeReportFields";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";

/** Props for IntakeInsights. */
interface IntakeInsightsProps {
  /** FHIR Appointment.id — used to look up the linked intake. */
  fhirAppointmentId: number;
}

/** Maps AI risk level strings to Badge colour classes. */
const RISK_CLASS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-200 text-red-900 border-red-300",
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the AI clinical assessment section.
 *
 * @param report - Parsed intake report object.
 */
function ReportSection({ report }: { report: IntakeReport }) {
  const riskKey = (report.risk_level ?? "").toLowerCase();

  return (
    <div className="space-y-4">
      {/* Risk level */}
      {report.risk_level && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Risk Level
          </span>
          <Badge variant="outline" className={RISK_CLASS[riskKey] ?? ""}>
            {report.risk_level}
          </Badge>
        </div>
      )}

      {/* Clinical overview */}
      {report.clinical_overview && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Clinical Overview
          </p>
          <p className="text-sm leading-relaxed">{report.clinical_overview}</p>
        </div>
      )}

      {/* Differential diagnosis — items may be strings or {condition, rationale, likelihood} */}
      {report.differential_diagnosis &&
        report.differential_diagnosis.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Differential Diagnosis
            </p>
            <DifferentialDiagnosisList items={report.differential_diagnosis} />
          </div>
        )}

      {/* Diagnostic plan — { laboratory_tests, imaging, other } of objects,
          or occasionally a plain string. Gated on the flattened length so the
          heading cannot render above an empty list. */}
      {flattenDiagnosticPlan(report.diagnostic_plan).length > 0 ||
      typeof report.diagnostic_plan === "string" ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Diagnostic Plan
          </p>
          <DiagnosticPlanField value={report.diagnostic_plan} />
        </div>
      ) : null}

      {/* Treatment plan — an array of recommendation objects, or a string. */}
      {(Array.isArray(report.treatment_plan) &&
        report.treatment_plan.length > 0) ||
      typeof report.treatment_plan === "string" ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Treatment Plan
          </p>
          <TreatmentPlanField value={report.treatment_plan} />
        </div>
      ) : null}

      {/* Red flags — items may be strings or structured objects. RedFlagList
          filters the agent's "Not reported" sentinel and hides itself when
          nothing survives, so the heading cannot appear above an empty list. */}
      <RedFlagList items={report.red_flags} />
    </div>
  );
}

/**
 * Fetches and displays the intake report linked to the given appointment.
 * Returns null if no intake was linked.
 *
 * @param fhirAppointmentId - FHIR Appointment.id to look up.
 */
export function IntakeInsights({ fhirAppointmentId }: IntakeInsightsProps) {
  const [intake, setIntake] = useState<TIntakeResponse | null | undefined>(
    undefined, // undefined = loading, null = not found
  );
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [data] = await getIntakeByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: fhirAppointmentId },
      });
      setIntake(data ?? null);
    }
    load();
  }, [fhirAppointmentId]);

  // Loading state
  if (intake === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  // No linked intake — appointment was booked directly
  if (!intake) return null;

  /* Cheap enough to run on every render — the report is a small object and
     parsing only does work when it arrives as a string. */
  const report = safeParseReport(intake.report);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          Pre-Appointment Intake
          <Badge variant="outline" className="text-[10px] ml-auto">
            {intake.mode === "VOICE" ? "Voice" : "Text"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* AI report — parsed through the shared helper, which unwraps the
            { status, data } envelope the assessment-plan-agent returns and
            tolerates a raw JSON string. Reading intake.report directly (as this
            card used to) renders nothing at all for either of those shapes. */}
        {report ? (
          <ReportSection report={report} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No clinical report available for this intake.
          </p>
        )}

        {/* Transcript toggle */}
        {intake.conversation && intake.conversation.length > 0 && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs text-muted-foreground"
              onClick={() => setTranscriptOpen((v) => !v)}
            >
              <span>
                View Transcript ({intake.conversation.length} messages)
              </span>
              {transcriptOpen ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Button>

            {transcriptOpen && (
              <ScrollArea className="mt-2 h-64 border rounded-md px-3 py-2 bg-muted/20">
                <div className="space-y-3">
                  {intake.conversation.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-semibold shrink-0 mt-0.5 uppercase",
                          msg.role === "user"
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {msg.role === "user" ? "Patient" : "AI"}
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
