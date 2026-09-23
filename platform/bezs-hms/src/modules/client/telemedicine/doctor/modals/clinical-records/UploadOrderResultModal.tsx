/**
 * UploadOrderResultModal — doctor-side result upload for a ServiceRequest.
 *
 * Layer: client / telemedicine / doctor / modals / clinical-records
 *
 * Opens when the doctor store's type === "uploadOrderResult". Reads
 * serviceRequestId, serviceRequestCode and patientFhirId from store data.
 *
 * FHIR records created per upload batch (same shape the patient side writes,
 * so both appear identically in the record):
 *   • ONE DiagnosticReport   — based_on: the ServiceRequest,
 *                              presented_form[]: one entry per file
 *   • ONE DocumentReference per file — content[0].attachment.url = FileNest id,
 *                              context.related: [DiagnosticReport, ServiceRequest]
 *
 * Mounted once inside DoctorModalProvider.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileNestProvider, type FileRecord } from "@filenest-fs/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";
import { createDiagnosticReportAction } from "@/modules/server/presentation/actions/diagnostic-report";
import { createDocumentReferenceAction } from "@/modules/server/presentation/actions/document-reference";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { resultDocumentName } from "@/modules/client/telemedicine/shared/components/clinical/documentNaming";

import { useDoctorStore } from "../../stores/doctor.store";
import {
  CLINICAL_UPLOAD_MIME_TYPES,
  FileStagingPanel,
  getRecordContentType,
  getRecordSize,
} from "./FileStagingPanel";

// ── Inner content ─────────────────────────────────────────────────────────────

interface UploadOrderResultContentProps {
  /** FHIR ServiceRequest.id the results belong to. */
  serviceRequestId: number;
  /** FHIR Patient.id — subject of the created resources. */
  patientFhirId?: number;
  /** Order name, e.g. "CBC" — used to name the created DocumentReference. */
  serviceRequestCode?: string;
}

/**
 * Staging panel plus the FHIR write for a completed upload batch.
 * Rendered inside FileNestProvider so useUpload has its context.
 *
 * @param serviceRequestId - Order the results are for.
 * @param patientFhirId - FHIR Patient.id, when known.
 */
function UploadOrderResultContent({
  serviceRequestId,
  patientFhirId,
  serviceRequestCode,
}: UploadOrderResultContentProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Writes one DiagnosticReport for the batch plus a DocumentReference per file.
   *
   * @param records - Successfully uploaded FileNest records.
   */
  async function handleBatchComplete(records: FileRecord[]) {
    setIsSaving(true);
    try {
      const subject =
        patientFhirId != null ? `Patient/${patientFhirId}` : undefined;
      const creation = new Date().toISOString();

      // ── 1. One DiagnosticReport carrying every file ──────────────────────
      const [drData, drErr] = await createDiagnosticReportAction({
        payload: {
          status: "preliminary",
          ...(subject ? { subject } : {}),
          based_on: [{ reference: `ServiceRequest/${serviceRequestId}` }],
          presented_form: records.map((r) => ({
            url: r.id,
            content_type: getRecordContentType(r),
            title: r.filename,
            size: getRecordSize(r),
            creation,
          })),
        },
      });

      if (drErr) {
        handleZSAError({
          err: drErr,
          fallbackMessage: "Failed to create diagnostic report",
        });
        return;
      }

      // ── 2. One DocumentReference per file ────────────────────────────────
      const related = [
        ...(drData?.id != null
          ? [{ reference: `DiagnosticReport/${drData.id}` }]
          : []),
        { reference: `ServiceRequest/${serviceRequestId}` },
      ];

      const results = await Promise.allSettled(
        records.map((r) =>
          createDocumentReferenceAction({
            payload: {
              status: "current",
              ...(subject ? { subject } : {}),
              /* Both the record and its attachment carry the qualified name.
                 The Documents tab reads attachment.title; description names the
                 record itself. Same string, so the two cannot disagree. */
              description: resultDocumentName(serviceRequestCode, r.filename),
              content: [
                {
                  attachment: {
                    url: r.id,
                    content_type: getRecordContentType(r),
                    title: resultDocumentName(serviceRequestCode, r.filename),
                    size: getRecordSize(r),
                    creation,
                  },
                },
              ],
              context: { related },
            },
          }),
        ),
      );

      /* A rejected promise or a ZSA error tuple both count as a failure. */
      const failCount = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value[1]),
      ).length;

      if (failCount > 0) {
        toast.warning(
          `${records.length - failCount}/${records.length} document references saved. Some failed.`,
        );
      } else {
        toast.success(
          `${records.length} file${records.length > 1 ? "s" : ""} uploaded to the record.`,
        );
      }

      /* The workspace is a server component that fetched DiagnosticReports at
         page load — refresh so the Orders tab shows the new files. */
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FileStagingPanel
      onBatchComplete={handleBatchComplete}
      isSaving={isSaving}
      hint="Reports, scans, lab results · max 50 MB each"
    />
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Result-upload dialog for a single order.
 * Reads its target from the doctor store — no props required.
 */
export function UploadOrderResultModal() {
  const isOpen = useDoctorStore((s) => s.isOpen);
  const type = useDoctorStore((s) => s.type);
  const data = useDoctorStore((s) => s.data);
  const onClose = useDoctorStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "uploadOrderResult";
  const serviceRequestId = data?.serviceRequestId;
  const patientFhirId = data?.patientFhirId;
  const serviceRequestCode = data?.serviceRequestCode;

  /*
   * FileNest path convention: patient id is the root folder, matching how
   * profile photos and patient-side result uploads are stored.
   *
   * Deliberately not scoped per order. Which order a file belongs to is
   * recorded in FHIR — the DiagnosticReport's based_on[] points at the
   * ServiceRequest, and that is what every reader resolves it through. Putting
   * the id in the path as well made a second, weaker copy of that link and one
   * folder per order.
   */
  const filePath =
    patientFhirId != null ? `${patientFhirId}/servicerequest` : "servicerequest";

  const tokenFetcher = useFileNestTokenFetcher({
    filePath,
    allowedMimeTypes: CLINICAL_UPLOAD_MIME_TYPES,
    maxSizeMb: 50,
    maxFiles: 10,
    metadata: { serviceRequestId, patientFhirId },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Result</DialogTitle>
          <DialogDescription>
            {serviceRequestCode
              ? `Results for: ${serviceRequestCode}`
              : "Upload result documents for this order."}
          </DialogDescription>
        </DialogHeader>

        {/*
         * Mount the provider only while the dialog is open with a known order —
         * staging state resets per open, and no token request fires just from
         * the modal existing in the layout tree.
         */}
        {open && serviceRequestId != null ? (
          <FileNestProvider
            tokenFetcher={tokenFetcher}
            projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
            baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
            queryClient={queryClient}
          >
            <UploadOrderResultContent
              serviceRequestId={serviceRequestId}
              patientFhirId={patientFhirId ?? undefined}
              serviceRequestCode={serviceRequestCode}
            />
          </FileNestProvider>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
