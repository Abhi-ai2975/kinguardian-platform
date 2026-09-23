/**
 * IntakeReportSection — AI pre-intake report with conversation transcript.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Renders the full intake record in two tabs:
 *   Summary     — structured AI clinical report (risk level, clinical overview,
 *                 differential diagnosis, diagnostic plan, treatment plan,
 *                 procedures, red flags)
 *   Conversation — patient–AI dialogue transcript
 *
 * Modelled on the MVP's IntakeInsights component (IntakeInsights.tsx) but
 * adapted for the TIntakeResponse schema and used as a standalone page section
 * rather than a dashboard card.
 *
 * The safeParseReport helper tolerates raw JSON strings and { status, data }
 * envelopes from the assessment-plan-agent API response, matching the MVP
 * approach to report parsing.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  MessageSquare,
  FileSearch,
  AlertCircle,
  ClipboardList,
  Stethoscope,
  ListChecks,
  TriangleAlert,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  flattenDiagnosticPlan,
  riskBadgeClass,
  safeParseReport,
  type DiagnosticItem,
  type IntakeReport,
} from "@/modules/client/telemedicine/doctor/component/clinical-records/intakeReport";
import { type TIntakeResponse } from "@/modules/entities/schemas/intake";

// ── Report typing + parsing ───────────────────────────────────────────────────

/*
 * The report shapes, the { status, data } envelope unwrapping and the risk-badge
 * colours live in clinical-records/intakeReport.ts and are shared with the
 * Clinical Records intake tab — the unwrapping in particular is easy to get
 * subtly wrong, so there is one implementation rather than two.
 */

// ── ReportView ────────────────────────────────────────────────────────────────

/**
 * Renders the structured AI clinical report in the Summary tab.
 * Mirrors the MVP's ReportView sub-component from IntakeInsights.tsx.
 *
 * @param report - Typed IntakeReport parsed from the raw agent output.
 */
function ReportView({ report }: { report: IntakeReport }) {
  // Flatten the three diagnostic sub-arrays into one ordered list
  const diagItems: DiagnosticItem[] = flattenDiagnosticPlan(
    report.diagnostic_plan,
  );

  // Filter out sentinel values the agent sometimes emits
  const redFlags = (report.red_flags ?? []).filter(
    (f) => f && f !== "Not reported",
  );

  return (
    <div className="space-y-4">
      {/* Risk level badge */}
      {report.risk_level && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Risk Level</p>
          <Badge
            className={cn("text-xs font-semibold", riskBadgeClass(report.risk_level))}
          >
            {report.risk_level}
          </Badge>
        </div>
      )}

      {/* Clinical overview */}
      {report.clinical_overview && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
            Clinical Overview
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {report.clinical_overview}
          </p>
        </div>
      )}

      {/* Differential diagnosis — one card per entry */}
      {report.differential_diagnosis &&
        report.differential_diagnosis.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Differential Diagnosis
                </p>
              </div>
              <div className="space-y-2">
                {report.differential_diagnosis.map((d, i) => (
                  <div
                    key={i}
                    className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {d.condition}
                      </p>
                      {d.likelihood && (
                        <Badge
                          variant="outline"
                          className="text-xs font-normal shrink-0"
                        >
                          {d.likelihood}
                        </Badge>
                      )}
                    </div>
                    {d.rationale && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {d.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      {/* Diagnostic plan — flattened list from laboratory_tests + imaging + other */}
      {diagItems.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <ClipboardList className="size-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Diagnostic Plan
              </p>
            </div>
            <ul className="space-y-1.5">
              {diagItems.map((item, i) => (
                <li key={i} className="text-sm text-foreground space-y-0.5">
                  <p className="font-medium">{item.test ?? item.study}</p>
                  {item.purpose && (
                    <p className="text-xs text-muted-foreground">{item.purpose}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Treatment plan — one card per treatment item */}
      {report.treatment_plan && report.treatment_plan.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <ListChecks className="size-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Treatment Plan
              </p>
            </div>
            <div className="space-y-2">
              {report.treatment_plan.map((t, i) => (
                <div
                  key={i}
                  className="rounded-md border bg-muted/30 px-3 py-2 space-y-1"
                >
                  {t.condition && (
                    <p className="text-xs text-muted-foreground">{t.condition}</p>
                  )}
                  {t.recommendation && (
                    <p className="text-sm text-foreground">{t.recommendation}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {t.route && <span>Route: {t.route}</span>}
                    {t.duration && <span>· {t.duration}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Procedures */}
      {report.procedures && report.procedures !== "Not reported" && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Stethoscope className="size-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Procedures
              </p>
            </div>
            <p className="text-sm text-foreground">{report.procedures}</p>
          </div>
        </>
      )}

      {/* Red flags — alert box with bullet list */}
      {redFlags.length > 0 && (
        <>
          <Separator />
          <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-1.5 dark:border-red-900 dark:bg-red-950/30">
            <div className="flex items-center gap-1.5">
              <TriangleAlert className="size-3.5 text-red-600 dark:text-red-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Red Flags
              </p>
            </div>
            <ul className="space-y-1">
              {redFlags.map((f, i) => (
                <li
                  key={i}
                  className="text-xs text-red-700 dark:text-red-400 flex gap-2"
                >
                  <span className="mt-0.5">•</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for IntakeReportSection. */
interface IntakeReportSectionProps {
  /**
   * Full intake record. The component reads both `report` (AI assessment)
   * and `conversation` (patient–AI transcript). Pass null or undefined to
   * render the "no intake data" empty state.
   */
  intake: TIntakeResponse | null | undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the AI pre-intake report and conversation transcript in a tabbed card.
 *
 * Summary tab:  structured clinical report sections (overview, differential,
 *               diagnostic plan, treatment plan, procedures, red flags).
 * Conversation: the patient's full dialogue with the intake AI agent.
 *
 * Either tab gracefully handles missing data with a short empty state message.
 *
 * @param intake - Full TIntakeResponse record (report + conversation).
 */
export function IntakeReportSection({ intake }: IntakeReportSectionProps) {
  const report = safeParseReport(intake?.report);
  const messages = intake?.conversation ?? [];
  const hasIntakeData = report !== null || messages.length > 0;

  // Empty state — no intake linked to this appointment
  if (!hasIntakeData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <FileSearch className="size-10 opacity-40" />
          <p className="text-sm">No intake data is available for this appointment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Section heading with risk badge */}
        <div className="flex items-center gap-2 mb-4">
          <Brain className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">AI Pre-Intake Assessment</h2>
          {report?.risk_level && (
            <Badge
              className={cn(
                "text-xs font-semibold ml-1",
                riskBadgeClass(report.risk_level),
              )}
            >
              {report.risk_level}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="summary" className="flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary" className="flex items-center gap-1.5">
              <FileText className="size-3" />
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="conversation"
              className="flex items-center gap-1.5"
            >
              <MessageSquare className="size-3" />
              Conversation
            </TabsTrigger>
          </TabsList>

          {/* Summary tab — structured AI report */}
          <TabsContent value="summary" className="mt-4">
            {report ? (
              <ReportView report={report} />
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No report available.
              </p>
            )}
          </TabsContent>

          {/* Conversation tab — patient / AI message transcript */}
          <TabsContent value="conversation" className="mt-4">
            {messages.length > 0 ? (
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                {messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        isUser ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm",
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No conversation transcript available.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
