/**
 * DocumentsTab — encounter-level documents (referrals, scans, summaries).
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Unlike the Orders tab, these documents are not tied to a ServiceRequest —
 * they are free-standing DocumentReferences attached to the Encounter, for
 * anything the doctor wants on file for the visit.
 *
 * Uploading opens UploadEncounterDocumentModal via the doctor store. The list
 * itself is server-fetched and refreshed with router.refresh() after an upload.
 *
 * File rows render through the shared AttachmentList, which owns the View and
 * Download actions and their presigned-URL handling — see its header for why
 * the two differ only by disposition.
 */

"use client";

import { FileStack, FolderOpen, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AttachmentList } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import { doctorStore } from "../../../stores/doctor.store";
import { contentAttachment } from "@/modules/entities/schemas/document-reference";
import type { Attachment } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import type { TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  /** DocumentReferences already attached to this encounter. */
  documents: TDocumentReferenceResponse[];
  /** FHIR Patient.id — the document subject and upload path root. */
  patientId: number;
  /** FHIR Encounter.id the uploads attach to, or null when none exists. */
  encounterId: number | null;
  /** FHIR Appointment.id — part of the preview route this tab links into. */
  appointmentId: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Lists and uploads encounter-level documents.
 *
 * @param documents - Existing DocumentReferences for the encounter.
 * @param patientId - FHIR Patient.id.
 * @param encounterId - FHIR Encounter.id, or null when unavailable.
 */
export function DocumentsTab({
  documents,
  patientId,
  encounterId,
  appointmentId,
}: DocumentsTabProps) {
  /* Flatten every attachment across all DocumentReferences, newest first. One
     DocumentReference can carry several files, so the list is per-file. */
  const files: Attachment[] = [...documents]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .flatMap((doc) =>
      (doc.content ?? []).map((entry, index) => {
        /* fhir-server flattens the attachment onto the entry; contentAttachment
           normalises whichever shape arrives. Reading entry.attachment directly
           found nothing, which is why every row was Untitled and had no file id
           for the View and Download actions. */
        const attachment = contentAttachment(entry);
        return {
          key: `${doc.id}-${index}`,
          fileId: attachment.url ?? null,
          /* Falls back to the record's own name — result uploads set both, and
             a document with only a description is still better than Untitled. */
          title: attachment.title ?? doc.description ?? null,
          contentType: attachment.content_type ?? null,
          size: attachment.size ?? null,
          uploadedAt: attachment.creation ?? doc.created_at ?? null,
          detail: doc.type_display ?? doc.type_text ?? null,
          /* The content entry's own id, paired with the document id below to
             locate this exact file. */
          previewId: entry.id ?? null,
          previewParentId: doc.id,
        };
      }),
    );

  return (
    <Card>
      <CardContent className="px-4 py-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <FileStack className="size-4 text-primary" />
          <p className="text-sm font-semibold">Documents</p>
          <Badge variant="secondary" className="text-xs font-normal">
            {files.length}
          </Badge>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 text-xs"
            disabled={encounterId == null}
            onClick={() =>
              doctorStore.getState().onOpen({
                type: "uploadEncounterDocument",
                data: { encounterId: encounterId!, patientFhirId: patientId },
              })
            }
          >
            <Upload className="size-3.5" />
            Upload
          </Button>
        </div>

        <Separator />

        {encounterId == null && (
          <p className="text-sm text-muted-foreground py-2">
            No encounter for this appointment — documents cannot be attached yet.
          </p>
        )}

        {encounterId != null && files.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <FolderOpen className="size-8 opacity-40" />
            <p className="text-sm">No documents for this visit.</p>
            <p className="text-xs opacity-70">
              Upload referral letters, scans or discharge summaries.
            </p>
          </div>
        )}

        {files.length > 0 && (
          <AttachmentList
            attachments={files}
            /* Both ids: the document proves what is being opened, the content
               id finds the exact file inside it. */
            previewHref={(file) =>
              file.previewId != null && file.previewParentId != null
                ? `/bezs/telemedicine/doctor/clinical-records/${patientId}/${appointmentId}` +
                  `/analyse?document=${file.previewParentId}&attachment=${file.previewId}`
                : null
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
