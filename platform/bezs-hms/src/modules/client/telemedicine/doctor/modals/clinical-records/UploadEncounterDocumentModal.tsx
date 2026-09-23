/**
 * UploadEncounterDocumentModal — free-standing document upload for an Encounter.
 *
 * Layer: client / telemedicine / doctor / modals / clinical-records
 *
 * Opens when the doctor store's type === "uploadEncounterDocument". Reads
 * encounterId and patientFhirId from store data.
 *
 * Unlike UploadOrderResultModal this writes **DocumentReference only** — no
 * DiagnosticReport. These documents are not results for an order; they are
 * things the doctor wants on file for the visit (referral letters, scans,
 * discharge summaries), so there is no ServiceRequest to base a report on.
 *
 * Each file becomes one DocumentReference with:
 *   subject           → Patient/{id}
 *   context.encounter → [{ reference: "Encounter/{id}" }]
 *   type_*            → the document type the doctor selected
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";
import { createDocumentReferenceAction } from "@/modules/server/presentation/actions/document-reference";

import { useDoctorStore } from "../../stores/doctor.store";
import {
  CLINICAL_UPLOAD_MIME_TYPES,
  FileStagingPanel,
  getRecordContentType,
  getRecordSize,
} from "./FileStagingPanel";

// ── Document types ────────────────────────────────────────────────────────────

/**
 * Document types offered for encounter attachments.
 *
 * LOINC document-type codes, matching what fhir-gql stores in
 * DocumentReference.type_code / type_display.
 */
const DOCUMENT_TYPES = [
  { code: "11488-4", display: "Consultation note" },
  { code: "57133-1", display: "Referral note" },
  { code: "18842-5", display: "Discharge summary" },
  { code: "18748-4", display: "Diagnostic imaging report" },
  { code: "11502-2", display: "Laboratory report" },
  { code: "34117-2", display: "History and physical note" },
  { code: "51852-2", display: "Letter" },
  { code: "34133-9", display: "Summary of episode note" },
];

/** LOINC system URI for the codes above. */
const LOINC_SYSTEM = "http://loinc.org";

// ── Inner content ─────────────────────────────────────────────────────────────

interface UploadEncounterDocumentContentProps {
  /** FHIR Encounter.id the documents attach to. */
  encounterId: number;
  /** FHIR Patient.id — subject of the created DocumentReferences. */
  patientFhirId?: number;
}

/**
 * Document type picker, optional description, and the staging panel.
 * Rendered inside FileNestProvider so useUpload has its context.
 *
 * @param encounterId - Encounter to attach the documents to.
 * @param patientFhirId - FHIR Patient.id, when known.
 */
function UploadEncounterDocumentContent({
  encounterId,
  patientFhirId,
}: UploadEncounterDocumentContentProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  /** Selected LOINC document-type code — defaults to a generic consultation note. */
  const [typeCode, setTypeCode] = useState(DOCUMENT_TYPES[0].code);
  /** Optional free-text description applied to every file in the batch. */
  const [description, setDescription] = useState("");

  /**
   * Writes one DocumentReference per uploaded file, all linked to the encounter.
   *
   * @param records - Successfully uploaded FileNest records.
   */
  async function handleBatchComplete(records: FileRecord[]) {
    setIsSaving(true);
    try {
      const subject =
        patientFhirId != null ? `Patient/${patientFhirId}` : undefined;
      const creation = new Date().toISOString();
      const selected = DOCUMENT_TYPES.find((t) => t.code === typeCode);

      const results = await Promise.allSettled(
        records.map((r) =>
          createDocumentReferenceAction({
            payload: {
              status: "current",
              ...(subject ? { subject } : {}),
              type_system: LOINC_SYSTEM,
              type_code: typeCode,
              type_display: selected?.display,
              type_text: selected?.display,
              date: creation,
              ...(description.trim() ? { description: description.trim() } : {}),
              content: [
                {
                  attachment: {
                    url: r.id,
                    content_type: getRecordContentType(r),
                    title: r.filename,
                    size: getRecordSize(r),
                    creation,
                  },
                },
              ],
              context: {
                encounter: [{ reference: `Encounter/${encounterId}` }],
              },
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
          `${records.length - failCount}/${records.length} documents saved. Some failed.`,
        );
      } else {
        toast.success(
          `${records.length} document${records.length > 1 ? "s" : ""} added to the record.`,
        );
        setDescription("");
      }

      /* The workspace fetched documents server-side at page load — refresh so
         the Documents tab shows the new entries. */
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Document metadata (applies to every file in the batch) ── */}
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="doc-type" className="text-xs">
            Document type
          </Label>
          <Select value={typeCode} onValueChange={setTypeCode}>
            <SelectTrigger id="doc-type" className="w-full">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t.code} value={t.code}>
                  {t.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-description" className="text-xs">
            Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="doc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Cardiology referral for follow-up"
          />
        </div>
      </div>

      <FileStagingPanel
        onBatchComplete={handleBatchComplete}
        isSaving={isSaving}
        hint="Letters, scans, summaries · max 50 MB each"
      />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Encounter document upload dialog.
 * Reads its target from the doctor store — no props required.
 */
export function UploadEncounterDocumentModal() {
  const isOpen = useDoctorStore((s) => s.isOpen);
  const type = useDoctorStore((s) => s.type);
  const data = useDoctorStore((s) => s.data);
  const onClose = useDoctorStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "uploadEncounterDocument";
  const encounterId = data?.encounterId;
  const patientFhirId = data?.patientFhirId;

  /* Same path convention as order results: patient id is the root folder. */
  const filePath =
    patientFhirId != null && encounterId != null
      ? `${patientFhirId}/encounter/${encounterId}`
      : encounterId != null
        ? `encounter/${encounterId}`
        : "uploads/documents";

  const tokenFetcher = useFileNestTokenFetcher({
    filePath,
    allowedMimeTypes: CLINICAL_UPLOAD_MIME_TYPES,
    maxSizeMb: 50,
    maxFiles: 10,
    metadata: { encounterId, patientFhirId },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Attach referral letters, scans or summaries to this visit.
          </DialogDescription>
        </DialogHeader>

        {open && encounterId != null ? (
          <FileNestProvider
            tokenFetcher={tokenFetcher}
            projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
            baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
            queryClient={queryClient}
          >
            <UploadEncounterDocumentContent
              encounterId={encounterId}
              patientFhirId={patientFhirId ?? undefined}
            />
          </FileNestProvider>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
