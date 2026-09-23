/**
 * DoctorReportSection — read-only display of the post-consultation doctor report.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Shows two sections:
 *   1. SOAP Note — read-only view of the AI-generated + doctor-reviewed note.
 *   2. FHIR Clinical Records — confirmed Conditions, Observations, MedicationRequests,
 *      and ServiceRequests that the doctor saved after reviewing the consultation.
 *
 * Used on both the doctor and patient appointment detail pages.
 * If neither the SOAP note nor any FHIR records are present, renders an empty state
 * informing the user that the doctor hasn't completed the review yet.
 */

"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope,
  ClipboardList,
  ListChecks,
  AlertCircle,
  Activity,
  Pill,
  FlaskConical,
  Eye,
  Clock,
  Upload,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewBadge } from "@/modules/client/telemedicine/shared/components/clinical/ReviewStatus";
import { AttachmentList } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import type { Attachment } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { SoapNote } from "@/modules/client/telemedicine/doctor/component/appointment-review/types";

// ── SOAP Note read-only view ──────────────────────────────────────────────────

/**
 * Renders a string array as a row of secondary badges.
 *
 * @param items - String values to display.
 */
function BadgeList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="secondary" className="text-xs font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Renders a string array as a bullet list.
 *
 * @param items - String values to display as bullets.
 */
function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm flex gap-2">
          <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Read-only display of a doctor-reviewed SOAP note.
 *
 * @param soap - Structured SOAP note from the consultation full report.
 */
function SoapNoteView({ soap }: { soap: SoapNote }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      {soap.summary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
            Summary
          </p>
          <p className="text-sm leading-relaxed">{soap.summary}</p>
        </div>
      )}

      {/* Subjective */}
      {(soap.subjective.chief_complaint ||
        soap.subjective.history_of_present_illness ||
        soap.subjective.associated_symptoms.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <ClipboardList className="size-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subjective
            </p>
          </div>
          {soap.subjective.chief_complaint && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Chief Complaint
              </p>
              <p className="text-sm">{soap.subjective.chief_complaint}</p>
            </div>
          )}
          {soap.subjective.history_of_present_illness && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                History of Present Illness
              </p>
              <p className="text-sm leading-relaxed">
                {soap.subjective.history_of_present_illness}
              </p>
            </div>
          )}
          {soap.subjective.associated_symptoms.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Associated Symptoms
              </p>
              <BadgeList items={soap.subjective.associated_symptoms} />
            </div>
          )}
        </div>
      )}

      {/* Objective */}
      {soap.objective.observations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Eye className="size-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Objective
            </p>
          </div>
          <BulletList items={soap.objective.observations} />
        </div>
      )}

      {/* Assessment */}
      {(soap.assessment.possible_conditions.length > 0 ||
        soap.assessment.clinical_reasoning) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="size-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assessment
            </p>
          </div>
          {soap.assessment.possible_conditions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Possible Conditions
              </p>
              <BadgeList items={soap.assessment.possible_conditions} />
            </div>
          )}
          {soap.assessment.clinical_reasoning && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Clinical Reasoning
              </p>
              <p className="text-sm leading-relaxed">
                {soap.assessment.clinical_reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Plan */}
      {(soap.plan.next_steps.length > 0 || soap.plan.when_to_seek_care) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <ListChecks className="size-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plan
            </p>
          </div>
          {soap.plan.next_steps.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Next Steps</p>
              <BulletList items={soap.plan.next_steps} />
            </div>
          )}
          {soap.plan.when_to_seek_care && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                When to Seek Care
              </p>
              <p className="text-sm leading-relaxed">
                {soap.plan.when_to_seek_care}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── FHIR resource list views ──────────────────────────────────────────────────

/**
 * Formats an ISO date string to a short human-readable date (e.g. "Jan 5, 2025").
 * Returns null if the input is nullish or unparseable.
 *
 * @param iso - ISO 8601 date or datetime string.
 */
function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * A small label + value row used inside detail cards.
 *
 * @param label - Short field label (e.g. "Severity").
 * @param value - Display value; if falsy the row is omitted.
 */
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground/70">{label}:</span> {value}
    </p>
  );
}

/**
 * Renders the list of confirmed FHIR Conditions with patient-relevant details.
 * Shows name, clinical/verification status, severity, onset date, and body sites.
 *
 * @param conditions - Array of condition records from the FHIR server.
 */
function ConditionList({ conditions }: { conditions: TConditionResponse[] }) {
  if (!conditions.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Activity className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conditions
        </p>
      </div>
      <div className="space-y-2">
        {conditions.map((c) => {
          const onset = fmtDate(c.onset_datetime) ?? c.onset_string ?? null;
          const abatement = fmtDate(c.abatement_datetime) ?? c.abatement_string ?? null;
          const severity = c.severity_display ?? c.severity_text ?? null;
          const bodySites = (c.body_site ?? [])
            .map((b) => b.coding_display ?? b.text)
            .filter(Boolean)
            .join(", ") || null;
          const notes = (c.note ?? []).map((n) => n.text).filter(Boolean).join(" ") || null;
          return (
            <div key={c.id} className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
              {/* Name + status badges */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug">
                  {c.code_display ?? c.code_text ?? "Unknown condition"}
                </p>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {c.clinical_status_code && (
                    <Badge variant="outline" className="text-xs font-normal capitalize">
                      {c.clinical_status_code}
                    </Badge>
                  )}
                  {c.verification_status_code && (
                    <Badge variant="secondary" className="text-xs font-normal capitalize">
                      {c.verification_status_code}
                    </Badge>
                  )}
                </div>
              </div>
              {/* Detail rows */}
              <div className="space-y-0.5">
                <DetailRow label="Severity" value={severity} />
                <DetailRow label="Onset" value={onset} />
                <DetailRow label="Resolved" value={abatement} />
                <DetailRow label="Body site" value={bodySites} />
                <DetailRow label="Notes" value={notes} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders the list of confirmed FHIR Observations with patient-relevant details.
 * Shows name, value + unit, interpretation, reference range, and effective date.
 *
 * @param observations - Array of observation records from the FHIR server.
 */
function ObservationList({ observations }: { observations: TObservationResponse[] }) {
  if (!observations.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Observations
        </p>
      </div>
      <div className="space-y-2">
        {observations.map((o) => {
          /* Resolve value[x] — prefer quantity, then codeable concept, then string/boolean */
          const value: string | null = (() => {
            if (o.value_quantity_value != null)
              return `${o.value_quantity_value}${o.value_quantity_unit ? ` ${o.value_quantity_unit}` : ""}`;
            if (o.value_codeable_concept_display) return o.value_codeable_concept_display;
            if (o.value_codeable_concept_text) return o.value_codeable_concept_text;
            if (o.value_string) return o.value_string;
            if (o.value_boolean != null) return String(o.value_boolean);
            if (o.value_integer != null) return String(o.value_integer);
            return null;
          })();

          /* Reference range — show first entry as "low – high unit" */
          const rr = o.reference_range?.[0];
          const refRange =
            rr?.low_value != null && rr?.high_value != null
              ? `${rr.low_value}${rr.low_unit ? ` ${rr.low_unit}` : ""} – ${rr.high_value}${rr.high_unit ? ` ${rr.high_unit}` : ""}`
              : rr?.text ?? null;

          /* Interpretation from first entry */
          const interpretation =
            o.interpretation?.[0]?.coding_display ??
            o.interpretation?.[0]?.text ??
            null;

          const effectiveDate = fmtDate(o.effective_date_time ?? o.effective_period_start ?? o.issued);

          return (
            <div key={o.id} className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
              {/* Name + value on same row when value is short */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug">
                  {o.code_display ?? o.code_text ?? "Unknown observation"}
                </p>
                {value && (
                  <p className="text-sm font-semibold shrink-0 text-primary">{value}</p>
                )}
              </div>
              {/* Detail rows */}
              <div className="space-y-0.5">
                <DetailRow label="Interpretation" value={interpretation} />
                <DetailRow label="Reference range" value={refRange} />
                <DetailRow label="Date" value={effectiveDate} />
                <DetailRow
                  label="Body site"
                  value={o.body_site_display ?? o.body_site_text ?? null}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders the list of confirmed FHIR MedicationRequests with patient-relevant details.
 * Shows name, dosage instructions, route, timing, quantity, supply duration, and notes.
 *
 * @param medications - Array of medication request records from the FHIR server.
 */
function MedicationList({
  medications,
}: {
  medications: TMedicationRequestResponse[];
}) {
  if (!medications.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Pill className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Medications
        </p>
      </div>
      <div className="space-y-2">
        {medications.map((m) => {
          const dosage = m.dosage_instruction?.[0];

          /* Dose amount — prefer dose_quantity, then dose_range */
          const doseAmt =
            dosage?.dose_and_rate?.[0]?.dose_quantity_value != null
              ? `${dosage.dose_and_rate[0].dose_quantity_value}${dosage.dose_and_rate[0].dose_quantity_unit ? ` ${dosage.dose_and_rate[0].dose_quantity_unit}` : ""}`
              : dosage?.dose_and_rate?.[0]?.dose_range_low_value != null
              ? `${dosage.dose_and_rate[0].dose_range_low_value}–${dosage.dose_and_rate[0].dose_range_high_value}${dosage.dose_and_rate[0].dose_range_high_unit ? ` ${dosage.dose_and_rate[0].dose_range_high_unit}` : ""}`
              : null;

          /* Timing — prefer text, then frequency+period, then timing code */
          const frequency =
            dosage?.timing_repeat_frequency != null && dosage?.timing_repeat_period != null
              ? `${dosage.timing_repeat_frequency}× per ${dosage.timing_repeat_period} ${dosage.timing_repeat_period_unit ?? ""}`.trim()
              : (dosage?.timing_code_display ?? null);

          /* Dispense quantity */
          const dispenseQty =
            m.dispense_quantity_value != null
              ? `${m.dispense_quantity_value}${m.dispense_quantity_unit ? ` ${m.dispense_quantity_unit}` : ""}`
              : null;

          /* Supply duration */
          const supplyDuration =
            m.dispense_expected_supply_duration_value != null
              ? `${m.dispense_expected_supply_duration_value}${m.dispense_expected_supply_duration_unit ? ` ${m.dispense_expected_supply_duration_unit}` : ""}`
              : null;

          const notes = (m.note ?? []).map((n) => n.text).filter(Boolean).join(" ") || null;

          return (
            <div key={m.id} className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
              {/* Name + status */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug">
                  {m.medication_code_display ?? m.medication_code_text ?? "Unknown medication"}
                </p>
                {m.status && (
                  <Badge variant="secondary" className="text-xs font-normal capitalize shrink-0">
                    {m.status}
                  </Badge>
                )}
              </div>
              {/* Detail rows */}
              <div className="space-y-0.5">
                {/* Free-text dosage instructions take priority */}
                <DetailRow label="Instructions" value={dosage?.text ?? null} />
                <DetailRow label="Dose" value={doseAmt} />
                <DetailRow label="Route" value={dosage?.route_display ?? dosage?.route_text ?? null} />
                <DetailRow label="Frequency" value={frequency} />
                <DetailRow label="Patient instructions" value={dosage?.patient_instruction ?? null} />
                <DetailRow label="Quantity dispensed" value={dispenseQty} />
                <DetailRow label="Supply duration" value={supplyDuration} />
                <DetailRow label="Notes" value={notes} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One confirmed ServiceRequest (order/investigation) card with an expandable list of
 * every uploaded result file for that order — a doctor order can have many result
 * files, so each gets its own View/Download row instead of a single collapsed button.
 *
 * @param sr              - ServiceRequest record.
 * @param files           - Uploaded result files for this SR, newest first.
 * @param onUploadResult  - Optional callback to open the upload-result modal for this request.
 *                          When provided, the card shows an "Upload Result" button.
 */
function ServiceRequestCard({
  sr,
  files,
  onUploadResult,
}: {
  sr: TServiceRequestResponse;
  files: Attachment[];
  onUploadResult?: (sr: TServiceRequestResponse) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasFiles = files.length > 0;
  const category = sr.category?.[0]?.coding_display ?? sr.category?.[0]?.text ?? null;
  const reason = sr.reason_code?.[0]?.coding_display ?? sr.reason_code?.[0]?.text ?? null;
  const occurrence = fmtDate(sr.occurrence_datetime ?? sr.occurrence_period_start) ?? null;
  const bodySites =
    (sr.body_site ?? []).map((b) => b.coding_display ?? b.text).filter(Boolean).join(", ") ||
    null;
  const notes = (sr.note ?? []).map((n) => n.text).filter(Boolean).join(" ") || null;

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
      {/* Name + badges + upload button */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug">
          {sr.code_display ?? sr.code_text ?? "Unknown order"}
        </p>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {sr.priority && (
            <Badge variant="outline" className="text-xs font-normal capitalize">
              {sr.priority}
            </Badge>
          )}
          {sr.status && (
            <Badge variant="secondary" className="text-xs font-normal capitalize">
              {sr.status}
            </Badge>
          )}
          {onUploadResult && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => onUploadResult(sr)}
            >
              <Upload className="size-3" />
              Upload Result
            </Button>
          )}
        </div>
      </div>
      {/* Detail rows */}
      <div className="space-y-0.5">
        <DetailRow label="Category" value={category} />
        <DetailRow label="Reason" value={reason} />
        <DetailRow label="Scheduled" value={occurrence} />
        <DetailRow label="Body site" value={bodySites} />
        <DetailRow label="Instructions" value={sr.patient_instruction ?? null} />
        <DetailRow label="Notes" value={notes} />
      </div>

      {/* Uploaded files toggle */}
      {hasFiles && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs -ml-2"
          onClick={() => setIsExpanded((v) => !v)}
        >
          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {isExpanded ? "Hide" : "View"} {files.length} uploaded file{files.length !== 1 ? "s" : ""}
        </Button>
      )}

      {/* Expanded file list — one row per uploaded file, each with its own View/Download */}
      {isExpanded && hasFiles && (
        <div className="pt-1">
          <AttachmentList attachments={files} />
        </div>
      )}
    </div>
  );
}

/**
 * Renders the list of confirmed FHIR ServiceRequests (orders/investigations).
 * Each order is its own independent card — cards don't need to align since
 * order counts and uploaded-file counts vary per request.
 *
 * @param serviceRequests    - Array of service request records from the FHIR server.
 * @param diagnosticReports  - DiagnosticReports for the same encounter, cross-referenced to
 *                             each ServiceRequest via based_on[] to find uploaded result files.
 * @param onUploadResult     - Optional callback to open the upload-result modal for a specific request.
 *                             When provided, each card shows an "Upload Result" button.
 */
function ServiceRequestList({
  serviceRequests,
  diagnosticReports,
  onUploadResult,
}: {
  serviceRequests: TServiceRequestResponse[];
  diagnosticReports: TDiagnosticReportResponse[];
  onUploadResult?: (sr: TServiceRequestResponse) => void;
}) {
  /** Map from ServiceRequest.id → DiagnosticReport[], newest DR first. */
  const drsByServiceRequestId = useMemo(() => {
    const map = new Map<number, TDiagnosticReportResponse[]>();
    const sorted = [...diagnosticReports].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
    for (const dr of sorted) {
      for (const ref of dr.based_on ?? []) {
        if (ref.reference_type === "ServiceRequest" && ref.reference_id != null) {
          const existing = map.get(ref.reference_id) ?? [];
          existing.push(dr);
          map.set(ref.reference_id, existing);
        }
      }
    }
    return map;
  }, [diagnosticReports]);

  if (!serviceRequests.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ClipboardList className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Orders / Investigations
        </p>
      </div>
      <div className="space-y-2">
        {serviceRequests.map((s) => {
          const files: Attachment[] = (
            drsByServiceRequestId.get(s.id) ?? []
          ).flatMap((dr) =>
            (dr.presented_form ?? []).map((pf, index) => ({
              key: `${dr.id}-${pf.id ?? index}`,
              fileId: pf.url ?? null,
              title: pf.title ?? null,
              contentType: pf.content_type ?? null,
              size: pf.size ?? null,
              uploadedAt: pf.creation ?? dr.created_at ?? null,
              detail: null,
            })),
          );
          return (
            <ServiceRequestCard key={s.id} sr={s} files={files} onUploadResult={onUploadResult} />
          );
        })}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for DoctorReportSection. */
export interface DoctorReportSectionProps {
  /**
   * SOAP note from the consultation full report (soap_report.soap).
   * Null when the doctor hasn't completed the post-consultation review yet.
   */
  soap: SoapNote | null | undefined;
  /** FHIR Conditions confirmed by the doctor. */
  conditions: TConditionResponse[];
  /** FHIR Observations confirmed by the doctor. */
  observations: TObservationResponse[];
  /** FHIR MedicationRequests confirmed by the doctor. */
  medications: TMedicationRequestResponse[];
  /** FHIR ServiceRequests confirmed by the doctor. */
  serviceRequests: TServiceRequestResponse[];
  /**
   * FHIR DiagnosticReports for the same encounter. Cross-referenced to each
   * ServiceRequest via based_on[] to surface a "View" button for uploaded result files.
   */
  diagnosticReports: TDiagnosticReportResponse[];
  /**
   * Optional callback called when the user clicks "Upload Result" on a ServiceRequest card.
   * When provided, each ServiceRequest card renders the Upload Result button.
   * Omit on the doctor view — only pass on the patient appointment detail page.
   */
  onUploadResult?: (sr: TServiceRequestResponse) => void;
  /**
   * Whether the doctor has approved this consultation's report
   * (`Consultation.published_at != null`).
   *
   * Only the SOAP note is gated on it. The FHIR records below are read back
   * from the chart, so their existence already means they were published —
   * there is nothing unreviewed about them to hide.
   */
  reviewed?: boolean;
  /**
   * True when a patient is reading this rather than the authoring doctor.
   *
   * Changes who may see an unreviewed note. The doctor sees their own draft,
   * tagged; the patient does not see it until it is approved. A draft is agent
   * output no clinician has read, and showing it to the patient would present
   * it as advice from their doctor.
   */
  isPatientView?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Read-only display of the doctor's post-consultation report.
 * Shows the SOAP note and confirmed FHIR clinical records.
 * Renders an empty state if the doctor hasn't completed the review yet.
 *
 * @param soap - SOAP note from the consultation full report.
 * @param conditions - Confirmed FHIR Conditions.
 * @param observations - Confirmed FHIR Observations.
 * @param medications - Confirmed FHIR MedicationRequests.
 * @param serviceRequests - Confirmed FHIR ServiceRequests.
 * @param diagnosticReports - DiagnosticReports for the same encounter (uploaded result files).
 */
export function DoctorReportSection({
  soap,
  conditions,
  observations,
  medications,
  serviceRequests,
  diagnosticReports,
  onUploadResult,
  reviewed = true,
  isPatientView = false,
}: DoctorReportSectionProps) {
  /*
   * The note is withheld from the patient until approved, but still shown to
   * the doctor — it is their own draft, and reviewing it is what they came
   * here to do. `reviewed` defaults to true so the doctor-side pages that do
   * not pass it are unaffected; the patient page passes it explicitly.
   */
  const noteWithheld = isPatientView && !reviewed;
  const hasSoap = soap != null && !noteWithheld;
  const hasFhirData =
    conditions.length > 0 ||
    observations.length > 0 ||
    medications.length > 0 ||
    serviceRequests.length > 0;

  /* Empty state — doctor hasn't confirmed the review yet */
  if (!hasSoap && !hasFhirData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Clock className="size-10 opacity-40" />
          <p className="text-sm text-center">
            Doctor&apos;s report hasn&apos;t been added yet.
          </p>
          <p className="text-xs text-center max-w-xs">
            This will be available after the doctor completes the post-consultation
            review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Doctor&apos;s Report</h2>
          {/* Doctor side only. The patient never sees an unreviewed note, so
              there is nothing for them to tag. */}
          {!isPatientView && soap != null && (
            <ReviewBadge approved={reviewed} className="ml-auto" />
          )}
        </div>

        {/* SOAP Note */}
        {hasSoap && (
          <>
            <SoapNoteView soap={soap!} />
          </>
        )}

        {/* Withheld note — the records below are in the chart, so say why the
            narrative is missing rather than leaving an unexplained gap. */}
        {noteWithheld && soap != null && (
          <div className="flex items-start gap-2.5 rounded-md border bg-muted/40 px-3 py-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Your doctor is still finalising their written notes for this
              visit. They&apos;ll appear here once complete.
            </p>
          </div>
        )}

        {/* FHIR records */}
        {hasFhirData && (
          <>
            {hasSoap && <Separator />}
            <div className="space-y-4">
              <ConditionList conditions={conditions} />
              {conditions.length > 0 && observations.length > 0 && <Separator />}
              <ObservationList observations={observations} />
              {(conditions.length > 0 || observations.length > 0) &&
                medications.length > 0 && <Separator />}
              <MedicationList medications={medications} />
              {(conditions.length > 0 ||
                observations.length > 0 ||
                medications.length > 0) &&
                serviceRequests.length > 0 && <Separator />}
              <ServiceRequestList
                serviceRequests={serviceRequests}
                diagnosticReports={diagnosticReports}
                onUploadResult={onUploadResult}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
