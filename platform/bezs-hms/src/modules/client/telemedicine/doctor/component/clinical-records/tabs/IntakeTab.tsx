/**
 * IntakeTab — AI pre-intake assessment and the patient↔AI intake dialogue.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Until now this material lived only on the old appointment detail page, so a
 * doctor writing the note could not see what the patient actually reported.
 * Bringing it into the workspace is the point of this tab.
 *
 * Red flags lead: they were previously rendered last, below the treatment plan,
 * and anything the AI flagged as urgent belongs at the top.
 *
 * The *consultation* transcript is deliberately not here. It is the source the
 * consultation note was written from, so it lives with the note — behind the
 * Conversation button on the Note tab — rather than three tabs away.
 */

"use client";

import {
  AlertCircle,
  Brain,
  ClipboardList,
  FileSearch,
  ListChecks,
  MessageSquare,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  diagnosticName,
  riskBadgeClass,
  safeParseReport,
  type DiagnosticItem,
  type IntakeReport,
} from "../intakeReport";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";

// ── Types ─────────────────────────────────────────────────────────────────────

interface IntakeTabProps {
  /** Intake record for this appointment, if the patient completed one. */
  intake: TIntakeResponse | null;
}

// ── Report sub-sections ───────────────────────────────────────────────────────

/**
 * A titled block within the assessment.
 *
 * @param icon - Section icon.
 * @param title - Section heading.
 * @param children - Section body.
 */
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Brain;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

/**
 * Renders one diagnostic-plan group (labs, imaging, other).
 *
 * @param label - Group name.
 * @param items - Entries in the group.
 */
function DiagnosticGroup({
  label,
  items,
}: {
  label: string;
  items: DiagnosticItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((d, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium">{diagnosticName(d) ?? "Unnamed"}</span>
            {d.purpose && (
              <span className="text-muted-foreground"> — {d.purpose}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The structured AI assessment.
 *
 * @param report - Parsed intake report.
 */
function AssessmentView({ report }: { report: IntakeReport }) {
  const plan = report.diagnostic_plan;
  const hasPlan =
    (plan?.laboratory_tests?.length ?? 0) > 0 ||
    (plan?.imaging?.length ?? 0) > 0 ||
    (plan?.other?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      {/* Red flags lead — anything urgent must not be scrolled past */}
      {report.red_flags && report.red_flags.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
          <div className="mb-1.5 flex items-center gap-2">
            <TriangleAlert className="size-3.5 text-red-600 dark:text-red-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
              Red flags
            </h3>
          </div>
          <ul className="list-inside list-disc space-y-1">
            {report.red_flags.map((flag, i) => (
              <li key={i} className="text-sm text-red-800 dark:text-red-200">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.clinical_overview && (
        <Section icon={ClipboardList} title="Clinical overview">
          <p className="text-sm leading-relaxed">{report.clinical_overview}</p>
        </Section>
      )}

      {report.differential_diagnosis &&
        report.differential_diagnosis.length > 0 && (
          <Section icon={ListChecks} title="Differential diagnosis">
            <div className="space-y-2">
              {report.differential_diagnosis.map((d, i) => (
                <div key={i} className="rounded-md border bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {d.condition ?? "Unnamed condition"}
                    </span>
                    {d.likelihood && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal capitalize"
                      >
                        {d.likelihood}
                      </Badge>
                    )}
                  </div>
                  {d.rationale && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {d.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

      {hasPlan && (
        <Section icon={FileSearch} title="Diagnostic plan">
          <div className="space-y-3">
            <DiagnosticGroup
              label="Laboratory"
              items={plan?.laboratory_tests ?? []}
            />
            <DiagnosticGroup label="Imaging" items={plan?.imaging ?? []} />
            <DiagnosticGroup label="Other" items={plan?.other ?? []} />
          </div>
        </Section>
      )}

      {report.treatment_plan && report.treatment_plan.length > 0 && (
        <Section icon={Stethoscope} title="Treatment plan">
          <div className="space-y-2">
            {report.treatment_plan.map((t, i) => (
              <div key={i} className="rounded-md border bg-muted/20 px-3 py-2">
                {t.condition && (
                  <p className="text-sm font-medium">{t.condition}</p>
                )}
                {t.recommendation && (
                  <p className="text-sm">{t.recommendation}</p>
                )}
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {t.route && <span>Route: {t.route}</span>}
                  {t.duration && <span>Duration: {t.duration}</span>}
                </div>
                {t.rationale && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {report.procedures && (
        <Section icon={AlertCircle} title="Procedures">
          <p className="text-sm leading-relaxed">{report.procedures}</p>
        </Section>
      )}
    </div>
  );
}

// ── Transcripts ───────────────────────────────────────────────────────────────

/**
 * One chat bubble in a transcript.
 *
 * @param speaker - Who spoke.
 * @param text - What they said.
 * @param timestamp - Optional formatted time.
 * @param isClinician - Aligns and tints clinician turns differently.
 */
function TranscriptTurn({
  speaker,
  text,
  timestamp,
  isClinician,
}: {
  speaker: string;
  text: string;
  timestamp?: string;
  isClinician: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-xs font-semibold",
            isClinician ? "text-primary" : "text-muted-foreground",
          )}
        >
          {speaker}
        </span>
        {timestamp && (
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {timestamp}
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Intake assessment and transcripts for the visit.
 *
 * @param intake - Intake record, or null when the patient completed none.
 * @param transcript - Live consultation transcript, possibly empty.
 */
export function IntakeTab({ intake }: IntakeTabProps) {
  const report = safeParseReport(intake?.report);
  const intakeMessages = intake?.conversation ?? [];

  const hasAnything = report !== null || intakeMessages.length > 0;

  if (!hasAnything) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
          <FileSearch className="size-10 opacity-30" />
          <p className="text-sm font-medium">No intake recorded.</p>
          <p className="max-w-xs text-center text-xs opacity-70">
            The patient did not complete an AI intake before this visit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          <p className="text-sm font-semibold">AI Pre-Intake Assessment</p>
          {report?.risk_level && (
            <Badge
              className={cn("text-xs font-semibold", riskBadgeClass(report.risk_level))}
            >
              {report.risk_level} risk
            </Badge>
          )}
        </div>

        <Separator />

        <Tabs defaultValue="assessment" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assessment" className="gap-1.5 text-xs">
              <ClipboardList className="size-3" />
              Assessment
            </TabsTrigger>
            <TabsTrigger value="intake" className="gap-1.5 text-xs">
              <MessageSquare className="size-3" />
              Intake chat
            </TabsTrigger>
          </TabsList>

          {/* ── AI assessment ── */}
          <TabsContent value="assessment" className="mt-4">
            {report ? (
              <AssessmentView report={report} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No AI assessment was generated for this visit.
              </p>
            )}
          </TabsContent>

          {/* ── Patient ↔ AI intake dialogue ── */}
          <TabsContent value="intake" className="mt-4">
            {intakeMessages.length > 0 ? (
              <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1">
                {intakeMessages.map((m, i) => (
                  <TranscriptTurn
                    key={i}
                    speaker={m.role === "assistant" ? "AI Assistant" : "Patient"}
                    text={m.content}
                    isClinician={m.role === "assistant"}
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No intake conversation was recorded.
              </p>
            )}
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
