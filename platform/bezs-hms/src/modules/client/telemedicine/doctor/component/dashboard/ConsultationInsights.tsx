/**
 * ConsultationInsights — doctor dashboard card for a completed consultation.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Displays three tabs for a completed virtual consultation:
 *   SOAP Note     — structured subjective / objective / assessment / plan
 *   Assessment    — AI assessment plan (risk level, differential, treatment)
 *   Conversation  — full LiveKit transcript between doctor and patient
 *
 * Mirrors drgodly-mvp ConsultationInsights.tsx in layout and content.
 * Accepts a pre-loaded TConsultationResponse — no internal fetch.
 */

"use client";

import { Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  flattenDiagnosticPlan,
  readableFallback,
  type IntakeReport,
} from "@/modules/client/telemedicine/doctor/component/clinical-records/intakeReport";
import {
  DiagnosticPlanField,
  DifferentialDiagnosisList,
  RedFlagList,
  TreatmentPlanField,
} from "@/modules/client/telemedicine/doctor/component/clinical-records/IntakeReportFields";
import { unwrapSoapNote } from "@/modules/client/telemedicine/doctor/component/clinical-records/clinicalDraft";
import {
  isDoctorApproved,
  ReviewBadge,
  ReviewBanner,
} from "@/modules/client/telemedicine/shared/components/clinical/ReviewStatus";
import type {
  TConsultationResponse,
  TSoapNote,
} from "@/modules/entities/schemas/consultation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationInsightsProps {
  /** Pre-loaded consultation record for the selected appointment. */
  consultation: TConsultationResponse;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Risk level → badge colour classes. */
const RISK_CLASS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-200 text-red-900 border-red-300",
};

/**
 * Safely extracts a string value from an unknown field.
 *
 * @param v - Unknown value.
 */
function str(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

/**
 * Safely extracts a string array from an unknown field.
 *
 * Only for fields the agent genuinely returns as strings (SOAP bullet lists).
 * Do NOT use it on assessment-plan sections — their entries are objects, and
 * stringifying them is what rendered raw JSON into the Differential Diagnosis
 * list. Those go through the renderers in IntakeReportFields instead.
 *
 * @param v - Unknown value.
 */
function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((i) => (typeof i === "string" ? i : readableFallback(i)));
}

/**
 * Digs the SOAP note out of a consultation record.
 *
 * Both `soap_note` and `full_report.soap_report` hold the doctor-report agent's
 * `{ soap, assessment, clinicalExtraction }` wrapper rather than the note, so
 * each is run through the shared unwrapper — the same one the clinical-records
 * Note tab seeds from, so the two surfaces cannot disagree about where the note
 * lives. `hasContent` then rejects a note whose sections are all empty, leaving
 * the tab's own "no SOAP note recorded" message to show instead.
 *
 * @param consultation - The consultation record.
 * @returns The SOAP note, or null when the record holds none.
 */
function resolveSoapNote(
  consultation: TConsultationResponse,
): TSoapNote | null {
  const candidates = [
    unwrapSoapNote(consultation.soap_note),
    unwrapSoapNote(consultation.full_report?.soap_report),
  ];

  for (const candidate of candidates) {
    if (candidate && hasContent(candidate)) return candidate as TSoapNote;
  }
  return null;
}

/**
 * Reports whether a SOAP section has anything worth rendering.
 *
 * Needed because the nested SOAP objects survive as `{}` — the agent may send
 * keys the schema does not list, and an inner z.object strips them — which is
 * truthy and previously rendered a section heading above nothing.
 *
 * @param section - One SOAP section object.
 * @returns True when at least one field holds content.
 */
function hasContent(section: unknown): boolean {
  if (!section || typeof section !== "object") return false;
  return Object.values(section as Record<string, unknown>).some((v) => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  });
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

/**
 * SOAP Note tab content.
 *
 * @param soap - SoapNote object from consultation.soap_note.
 */
function SoapTab({ soap }: { soap: TSoapNote | null }) {
  if (!soap) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No SOAP note recorded for this consultation.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Each section is gated on hasContent rather than on the object being
          present. The agent can emit a section whose keys the schema does not
          list; the inner z.object strips them, leaving `{}` — truthy, so the
          heading rendered above nothing. That is what showed an empty
          ASSESSMENT. Any section with no readable content is now skipped. */}

      {/* Subjective */}
      {hasContent(soap.subjective) && soap.subjective && (
        <Section label="Subjective">
          {soap.subjective.chief_complaint && (
            <Field label="Chief Complaint" value={soap.subjective.chief_complaint} />
          )}
          {soap.subjective.history_of_present_illness && (
            <Field
              label="History of Present Illness"
              value={soap.subjective.history_of_present_illness}
            />
          )}
          {soap.subjective.associated_symptoms &&
            soap.subjective.associated_symptoms.length > 0 && (
              <BulletField
                label="Associated Symptoms"
                items={soap.subjective.associated_symptoms}
              />
            )}
        </Section>
      )}

      {/* Objective */}
      {hasContent(soap.objective) && soap.objective && (
        <Section label="Objective">
          {soap.objective.observations &&
            soap.objective.observations.length > 0 && (
              <BulletField
                label="Observations"
                items={soap.objective.observations}
              />
            )}
          <ExtraFields section={soap.objective} known={["observations"]} />
        </Section>
      )}

      {/* Assessment */}
      {hasContent(soap.assessment) && soap.assessment && (
        <Section label="Assessment">
          {soap.assessment.possible_conditions &&
            soap.assessment.possible_conditions.length > 0 && (
              <BulletField
                label="Possible Conditions"
                items={soap.assessment.possible_conditions}
              />
            )}
          {soap.assessment.clinical_reasoning && (
            <Field
              label="Clinical Reasoning"
              value={soap.assessment.clinical_reasoning}
            />
          )}
          {/* Anything the agent sent under keys this renderer does not know.
              Reachable now that the schema passes unknown keys through, and it
              is why the section can no longer look blank. */}
          <ExtraFields
            section={soap.assessment}
            known={["possible_conditions", "clinical_reasoning"]}
          />
        </Section>
      )}

      {/* Plan */}
      {hasContent(soap.plan) && soap.plan && (
        <Section label="Plan">
          {soap.plan.next_steps && soap.plan.next_steps.length > 0 && (
            <BulletField label="Next Steps" items={soap.plan.next_steps} />
          )}
          {soap.plan.when_to_seek_care && (
            <Field label="When to Seek Care" value={soap.plan.when_to_seek_care} />
          )}
        </Section>
      )}

      {/* Summary */}
      {soap.summary && (
        <Section label="Summary">
          <p className="leading-relaxed">{soap.summary}</p>
        </Section>
      )}
    </div>
  );
}

/**
 * Assessment & Plan tab content — mirrors IntakeInsights report layout.
 *
 * @param plan - Raw assessment_plan object from full_report.
 */
function AssessmentTab({ plan }: { plan: Record<string, unknown> | undefined }) {
  if (!plan) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No assessment plan available.
      </p>
    );
  }

  const riskLevel = str(plan.risk_level);
  const overview = str(plan.clinical_overview);

  /* Every remaining section is a list of objects, not strings. They are handed
     to the shared renderers untouched — reading them with str()/strArr() is
     what dropped the diagnostic and treatment plans and printed raw JSON into
     the differential. */
  const differential = plan.differential_diagnosis;
  const hasDiagnostic =
    flattenDiagnosticPlan(plan.diagnostic_plan as IntakeReport["diagnostic_plan"])
      .length > 0 || typeof plan.diagnostic_plan === "string";
  const hasTreatment =
    (Array.isArray(plan.treatment_plan) && plan.treatment_plan.length > 0) ||
    typeof plan.treatment_plan === "string";

  return (
    <div className="space-y-4 text-sm">
      {riskLevel && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Risk Level
          </span>
          <Badge
            variant="outline"
            className={RISK_CLASS[riskLevel.toLowerCase()] ?? ""}
          >
            {riskLevel}
          </Badge>
        </div>
      )}

      {overview && <Field label="Clinical Overview" value={overview} />}

      {Array.isArray(differential) && differential.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Differential Diagnosis</p>
          <DifferentialDiagnosisList items={differential} />
        </div>
      )}

      {hasDiagnostic && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Diagnostic Plan</p>
          <DiagnosticPlanField value={plan.diagnostic_plan} />
        </div>
      )}

      {hasTreatment && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Treatment Plan</p>
          <TreatmentPlanField value={plan.treatment_plan} />
        </div>
      )}

      <RedFlagList items={plan.red_flags} />
    </div>
  );
}

/**
 * Conversation tab — LiveKit transcript.
 *
 * @param messages - Transcript messages from virtual_conversation.
 */
function ConversationTab({
  messages,
}: {
  messages: TConsultationResponse["virtual_conversation"];
}) {
  if (!messages || messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No transcript recorded.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, i) => (
        <div key={i} className="flex items-start gap-2">
          <span
            className={cn(
              "text-[10px] font-semibold shrink-0 mt-0.5 uppercase",
              msg.speaker === "DOCTOR" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {msg.speaker === "DOCTOR" ? "Doctor" : "Patient"}
          </span>
          <p className="text-xs leading-relaxed">{msg.text}</p>
        </div>
      ))}
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
        {label}
      </p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="leading-relaxed">{value}</p>
    </div>
  );
}

/**
 * Renders any keys in a SOAP section that the typed renderers do not cover.
 *
 * The doctor-report agent is an external service whose exact keys are not
 * pinned here, and SoapNoteSchema now passes unknown ones through instead of
 * stripping them. Without this they would parse successfully and then vanish
 * silently — the worst outcome for a clinical note.
 *
 * @param section - The SOAP section object.
 * @param known - Keys already rendered by the caller, skipped here.
 */
function ExtraFields({
  section,
  known,
}: {
  section: unknown;
  known: string[];
}) {
  if (!section || typeof section !== "object") return null;

  const extras = Object.entries(section as Record<string, unknown>).filter(
    ([key, value]) =>
      !known.includes(key) &&
      value != null &&
      (!Array.isArray(value) || value.length > 0) &&
      (typeof value !== "string" || value.trim().length > 0),
  );
  if (extras.length === 0) return null;

  return (
    <>
      {extras.map(([key, value]) => {
        /* Key comes from the agent in snake_case; title it for display. */
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return Array.isArray(value) ? (
          <BulletField key={key} label={label} items={strArr(value)} />
        ) : (
          <Field key={key} label={label} value={readableFallback(value)} />
        );
      })}
    </>
  );
}

function BulletField({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Tabbed card showing SOAP note, assessment plan, and conversation transcript
 * for a completed consultation.
 *
 * @param consultation - Pre-loaded consultation record.
 */
export function ConsultationInsights({ consultation }: ConsultationInsightsProps) {
  const assessmentPlan = consultation.full_report?.assessment_plan as
    | Record<string, unknown>
    | undefined;

  /* soap_note holds the agent's wrapper, not the note — see resolveSoapNote. */
  const soap = resolveSoapNote(consultation);

  /*
   * No FHIR fallback here: this card has no encounter resources to count, so
   * an unstamped pre-migration consultation reads as unapproved. That is the
   * safe direction to be wrong in — it marks a reviewed record as a draft
   * rather than presenting a draft as part of the chart.
   */
  const isApproved = isDoctorApproved(consultation.published_at, false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="size-4 text-muted-foreground" />
          Consultation Insights
          <div className="ml-auto flex items-center gap-1.5">
            {/*
              Two different facts, both worth showing here. The status badge is
              the call's lifecycle (COMPLETED means it ended and the agent wrote
              a report); the review badge is whether a doctor has since approved
              what the agent produced. A completed consultation whose output
              nobody has read is the case this card must not present as final.
            */}
            <ReviewBadge approved={isApproved} />
            <Badge variant="outline" className="text-[10px] capitalize">
              {consultation.status.toLowerCase()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Above the tabs so it is seen whichever one is open — every tab here
            renders agent output, not chart data, until the doctor approves. */}
        {!isApproved && (
          <ReviewBanner
            subject="note and clinical entries"
            reviewHref={`/bezs/telemedicine/doctor/appointments/${consultation.fhir_appointment_id}/review`}
            className="mb-4"
          />
        )}

        <Tabs defaultValue="soap">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="soap" className="flex-1 text-xs">
              SOAP Note
            </TabsTrigger>
            <TabsTrigger value="assessment" className="flex-1 text-xs">
              Assessment
            </TabsTrigger>
            <TabsTrigger value="conversation" className="flex-1 text-xs">
              Conversation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="soap">
            <ScrollArea className="h-72">
              <SoapTab soap={soap} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="assessment">
            <ScrollArea className="h-72">
              <AssessmentTab plan={assessmentPlan} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="conversation">
            <ScrollArea className="h-72">
              <ConversationTab messages={consultation.virtual_conversation} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
