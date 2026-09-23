/**
 * ServiceRequestRecordCard — expandable record card for one doctor order.
 *
 * Layer: client / telemedicine / patient / component / medical-records
 *
 * Displays a single FHIR ServiceRequest with:
 *   • Category icon (lab, imaging, procedure, or general)
 *   • Order name, humanised status badge, priority badge
 *   • Detail rows: category, reason, scheduled date, doctor instructions
 *   • Appointment context chip: date + doctor name (when available via encounter)
 *   • Upload count chip (amber = none, green = has files)
 *   • "View Files" accordion — flattened DiagnosticReport.presentedForm entries
 *     with per-file Download buttons
 *   • "Upload Result" button — opens the existing UploadResultModal via patientStore
 *
 * "use client" is required for the accordion useState and the modal open call.
 */

"use client";

import { useState } from "react";
import {
  FlaskConical,
  ScanLine,
  Stethoscope,
  ClipboardList,
  Upload,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  UserRound,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AttachmentList } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import { patientStore } from "../../stores/patient.store";
import type { Attachment } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a FHIR ServiceRequest status code to a patient-friendly label.
 * @param status - Raw FHIR status string.
 */
function humanStatus(status: string): string {
  const map: Record<string, string> = {
    active: "Open",
    completed: "Done",
    revoked: "Cancelled",
    draft: "Draft",
    "on-hold": "On Hold",
    "entered-in-error": "Error",
    unknown: "Unknown",
  };
  return map[status] ?? status;
}

/**
 * Returns badge variant based on SR status for visual priority cues.
 * @param status - Raw FHIR status string.
 */
function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "completed") return "secondary";
  if (status === "revoked") return "destructive";
  return "outline";
}

/**
 * Formats an ISO date string as a short locale date (e.g. "Jan 5, 2025").
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
 * Selects a Lucide icon component based on the SR's category code or text.
 * Falls back to ClipboardList for unknown categories.
 *
 * @param sr - ServiceRequest record.
 */
function getCategoryIcon(
  sr: TServiceRequestResponse,
): React.FC<{ className?: string }> {
  const raw =
    (sr.category?.[0]?.coding_code ?? sr.category?.[0]?.text ?? "").toLowerCase();
  if (raw.includes("lab") || raw.includes("108252007")) return FlaskConical;
  if (raw.includes("imag") || raw.includes("363679005")) return ScanLine;
  if (raw.includes("proced") || raw.includes("387713003")) return Stethoscope;
  return ClipboardList;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ServiceRequestRecordCardProps {
  /** The ServiceRequest (doctor order) to display. */
  sr: TServiceRequestResponse;
  /**
   * DiagnosticReports already filtered to this SR's based_on reference.
   * Each DR's presentedForm[] entries are the individual uploaded files.
   */
  diagnosticReports: TDiagnosticReportResponse[];
  /**
   * Appointment that linked to the same encounter as this SR.
   * Used for the "From appointment" context chip (date + doctor name).
   * Null/undefined when the SR has no encounter or appointment context.
   */
  appointment?: TAppointmentResponse | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Expandable card for a single doctor order (ServiceRequest).
 * Shows order metadata, appointment context, upload status, and a file list.
 *
 * @param sr               - ServiceRequest record.
 * @param diagnosticReports - Pre-filtered DRs for this SR's uploaded files.
 * @param appointment       - Optional appointment for context chip.
 */
export function ServiceRequestRecordCard({
  sr,
  diagnosticReports,
  appointment,
}: ServiceRequestRecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────────

  /** Flatten presentedForm across all DRs, newest DR first. */
  const allFiles: Attachment[] = [...diagnosticReports]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .flatMap((dr) =>
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

  const hasFiles = allFiles.length > 0;

  /** Doctor name from appointment participant list (first Practitioner participant). */
  const doctorName =
    appointment?.participant?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? null;

  /** Appointment date formatted as "Jan 5, 2025". */
  const appointmentDate = fmtDate(appointment?.start);

  const CategoryIcon = getCategoryIcon(sr);

  const category =
    sr.category?.[0]?.coding_display ?? sr.category?.[0]?.text ?? null;
  const reason =
    sr.reason_code?.[0]?.coding_display ?? sr.reason_code?.[0]?.text ?? null;
  const scheduled = fmtDate(sr.occurrence_datetime ?? sr.occurrence_period_start);

  // ── Handlers ────────────────────────────────────────────────────────────────

  /**
   * Opens the Upload Result modal for this SR via the patient store.
   */
  function handleUploadClick() {
    patientStore.getState().onOpen({
      type: "uploadResult",
      data: {
        serviceRequestId: sr.id,
        serviceRequestCode: sr.code_display ?? sr.code_text ?? undefined,
        patientFhirId: sr.subject_id ?? undefined,
      },
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Card className="overflow-hidden relative">
      <CardContent className="p-0">
        {/* ── Main card row ─────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Top row: icon + name + badges */}
          <div className="flex items-start gap-3">
            {/* Category icon */}
            <div className="shrink-0 mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
              <CategoryIcon className="size-4" />
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold leading-snug">
                  {sr.code_display ?? sr.code_text ?? "Unknown Order"}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Humanised status */}
                  <Badge
                    variant={statusVariant(sr.status)}
                    className="text-xs font-normal capitalize"
                  >
                    {humanStatus(sr.status)}
                  </Badge>
                  {/* Priority (only show non-routine) */}
                  {sr.priority && sr.priority !== "routine" && (
                    <Badge
                      variant="outline"
                      className="text-xs font-normal capitalize border-amber-500/50 text-amber-600 dark:text-amber-400"
                    >
                      {sr.priority}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Detail rows */}
              <div className="mt-1.5 space-y-0.5">
                {category && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">Category:</span>{" "}
                    {category}
                  </p>
                )}
                {reason && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">Reason:</span>{" "}
                    {reason}
                  </p>
                )}
                {scheduled && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">Scheduled:</span>{" "}
                    {scheduled}
                  </p>
                )}
                {sr.patient_instruction && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">Instructions:</span>{" "}
                    {sr.patient_instruction}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Appointment context chip */}
          {(appointmentDate ?? doctorName) && (
            <div className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex-wrap gap-y-1">
              {appointmentDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3 shrink-0" />
                  {appointmentDate}
                </span>
              )}
              {doctorName && (
                <span className="flex items-center gap-1.5">
                  <UserRound className="size-3 shrink-0" />
                  {doctorName}
                </span>
              )}
            </div>
          )}

          {/* Upload status + actions row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* File count chip */}
            <div className="flex items-center gap-1.5">
              {hasFiles ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="size-3.5" />
                  {allFiles.length} file{allFiles.length !== 1 ? "s" : ""} uploaded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <AlertCircle className="size-3.5" />
                  No uploads yet
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* View files toggle — only shown when files exist */}
              {hasFiles && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setIsExpanded((v) => !v)}
                >
                  {isExpanded ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                  {isExpanded ? "Hide" : "View"} Files
                </Button>
              )}

              {/* Upload result */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleUploadClick}
              >
                <Upload className="size-3" />
                Upload Result
              </Button>
            </div>
          </div>
        </div>

        {/* ── Expanded file list ────────────────────────────────────────────── */}
        {isExpanded && hasFiles && (
          <>
            <Separator />
            <div className="px-4 py-3 space-y-1.5 bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Uploaded Files
              </p>
              <AttachmentList attachments={allFiles} />
            </div>
          </>
        )}

        {/* Amber left border accent for orders with no uploads */}
        {!hasFiles && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg bg-amber-500/60 pointer-events-none" />
        )}
      </CardContent>
    </Card>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

/**
 * Empty state shown when no service requests match the active filter.
 *
 * @param filtered - True when a filter is active (vs. no records at all).
 */
export function RecordListEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <FileText className="size-10 opacity-30" />
      <p className="text-sm font-medium text-center">
        {filtered
          ? "No records match this filter."
          : "No orders from your doctors yet."}
      </p>
      <p className="text-xs text-center max-w-xs opacity-70">
        {filtered
          ? "Try switching to a different tab."
          : "Test orders and investigations will appear here after your appointment."}
      </p>
    </div>
  );
}
