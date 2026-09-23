/**
 * OrdersTab — orders and investigations, each with its own results attached.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * One section, not two. Orders and their uploaded results were previously split
 * across "Orders & Investigations" and a separate "Results" card that listed
 * every published order again — so a single order appeared twice on one screen,
 * and its result files sat far away from the order they belonged to. They are
 * now the same row: the order, its upload action, and its files together.
 *
 * Only a published order can carry results: a DiagnosticReport must reference a
 * real ServiceRequest, which does not exist until the draft is published. An
 * unpublished order therefore shows why it cannot accept uploads yet rather
 * than an upload button that would fail.
 *
 * The DiagnosticReport → ServiceRequest cross-reference mirrors the
 * patient-side MedicalRecordsClient so both sides resolve uploads identically.
 * File rows render through the shared AttachmentList, which owns the View and
 * Download actions and their presigned-URL handling.
 */

"use client";

import { useMemo } from "react";
import { FlaskConical, Lock, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AttachmentList } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import { ClinicalEntryList } from "../entries/ClinicalEntryList";
import { ServiceRequestFields } from "../entries/fields/ServiceRequestFields";
import { serviceRequestSummary } from "../entries/summaries";
import { doctorStore } from "../../../stores/doctor.store";
import type { Attachment } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import type { ServiceRequestFormItem } from "../../appointment-review/types";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

// ── Blank-entry factory ───────────────────────────────────────────────────────

/** Creates a blank order. LOINC is the default system for tests. */
function emptyServiceRequest(): ServiceRequestFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "LOINC",
    status: "active",
    intent: "order",
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrdersTabProps {
  /** Current service request items. */
  serviceRequests: ServiceRequestFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onServiceRequestsChange: (items: ServiceRequestFormItem[]) => void;
  /** Writes one order to the EMR, resolving to its FHIR id. */
  onPersistServiceRequest: (item: ServiceRequestFormItem) => Promise<number>;
  /** Removes one order from the EMR. */
  onDeleteServiceRequest: (item: ServiceRequestFormItem) => Promise<void>;
  /** DiagnosticReports for this encounter — used to resolve uploaded results. */
  diagnosticReports: TDiagnosticReportResponse[];
  /** FHIR Patient.id — needed for the upload path and DiagnosticReport subject. */
  patientId: number;
  /** FHIR Appointment.id — part of the preview route this tab links into. */
  appointmentId: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Orders editor with per-order result uploads and file lists.
 *
 * @param serviceRequests - Current order items.
 * @param onServiceRequestsChange - Order list change handler.
 * @param diagnosticReports - DiagnosticReports for the encounter.
 * @param patientId - FHIR Patient.id.
 */
export function OrdersTab({
  serviceRequests,
  onServiceRequestsChange,
  onPersistServiceRequest,
  onDeleteServiceRequest,
  diagnosticReports,
  patientId,
  appointmentId,
}: OrdersTabProps) {
  /**
   * Map ServiceRequest.id → the files uploaded against it, flattened out of
   * every DiagnosticReport whose based_on[] points at that order.
   */
  const filesByServiceRequestId = useMemo(() => {
    const map = new Map<number, Attachment[]>();

    for (const dr of diagnosticReports) {
      for (const ref of dr.based_on ?? []) {
        if (ref.reference_type !== "ServiceRequest" || ref.reference_id == null) {
          continue;
        }
        const existing = map.get(ref.reference_id) ?? [];
        for (const [index, pf] of (dr.presented_form ?? []).entries()) {
          existing.push({
            key: `${dr.id}-${pf.id ?? index}`,
            fileId: pf.url ?? null,
            title: pf.title ?? null,
            contentType: pf.content_type ?? null,
            size: pf.size ?? null,
            uploadedAt: pf.creation ?? dr.created_at ?? null,
            detail: null,
            /* Identifies the file inside its report for the preview link. */
            previewId: pf.id ?? null,
          });
        }
        map.set(ref.reference_id, existing);
      }
    }
    return map;
  }, [diagnosticReports]);

  /** Total files across every order — shown as the section hint. */
  const totalFiles = useMemo(
    () =>
      [...filesByServiceRequestId.values()].reduce(
        (sum, files) => sum + files.length,
        0,
      ),
    [filesByServiceRequestId],
  );

  return (
    <ClinicalEntryList
      items={serviceRequests}
      onChange={onServiceRequestsChange}
      icon={FlaskConical}
      title="Orders & Investigations"
      addLabel="Add order"
      emptyLabel="No orders for this visit."
      hint={
        totalFiles > 0
          ? `${totalFiles} result file${totalFiles > 1 ? "s" : ""} attached`
          : undefined
      }
      createItem={emptyServiceRequest}
      summary={serviceRequestSummary}
      onPersistItem={onPersistServiceRequest}
      onDeleteItem={onDeleteServiceRequest}
      renderFields={(item, onItemChange) => (
        <ServiceRequestFields item={item} onChange={onItemChange} />
      )}
      renderRowExtra={(order) => (
        <OrderResults
          order={order}
          files={
            order.fhirId != null
              ? (filesByServiceRequestId.get(order.fhirId) ?? [])
              : []
          }
          patientId={patientId}
          appointmentId={appointmentId}
        />
      )}
    />
  );
}

// ── Row extra ─────────────────────────────────────────────────────────────────

interface OrderResultsProps {
  /** The order this block hangs off. */
  order: ServiceRequestFormItem;
  /** Files already uploaded against it. */
  files: Attachment[];
  /** FHIR Patient.id — the DiagnosticReport subject. */
  patientId: number;
  /** FHIR Appointment.id — part of the preview route. */
  appointmentId: number;
}

/**
 * Result files and the upload action for one order.
 *
 * @param order - The order.
 * @param files - Its uploaded result files.
 * @param patientId - FHIR Patient.id.
 */
function OrderResults({
  order,
  files,
  patientId,
  appointmentId,
}: OrderResultsProps) {
  /* Unpublished: no ServiceRequest exists in FHIR for a DiagnosticReport to
     reference, so say that rather than offer an upload that cannot succeed. */
  if (order.fhirId == null) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Publish this record to attach results to this order.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Labelled so the block reads as this order's results rather than as a
          continuation of the order row above it. */}
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Results
        </p>
        <span className="text-xs text-muted-foreground">
          {files.length === 0
            ? "none uploaded yet"
            : `${files.length} file${files.length > 1 ? "s" : ""}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto h-7 shrink-0 gap-1.5 text-xs"
          onClick={() =>
            doctorStore.getState().onOpen({
              type: "uploadOrderResult",
              data: {
                serviceRequestId: order.fhirId!,
                serviceRequestCode: order.display,
                patientFhirId: patientId,
              },
            })
          }
        >
          <Upload className="size-3.5" />
          Upload
        </Button>
      </div>

      {files.length > 0 && (
        <AttachmentList
          attachments={files}
          /* Preview needs both ids: the order proves the file belongs to this
             patient, the attachment id finds it within the order's reports. */
          previewHref={(file) =>
            file.previewId != null && order.fhirId != null
              ? `/bezs/telemedicine/doctor/clinical-records/${patientId}/${appointmentId}` +
                `/analyse?serviceRequest=${order.fhirId}&attachment=${file.previewId}`
              : null
          }
        />
      )}
    </div>
  );
}
