/**
 * previewAttachment — resolves a preview URL's query params to one file.
 *
 * Layer: server / presentation / helpers
 *
 * The preview screen is reached from two places that store their files
 * differently, so it accepts two shapes:
 *
 *   ?serviceRequest={id}&attachment={presentedFormId}
 *       An order result. The file lives on a DiagnosticReport whose based_on[]
 *       points at the ServiceRequest.
 *
 *   ?document={id}&attachment={contentId}
 *       An encounter document. The file lives on a DocumentReference's
 *       content[] entry.
 *
 * Both resolve in two steps, and the second is scoped to the first: the parent
 * resource is fetched, then the attachment is looked for *within it*. An
 * attachment id belonging to another patient's order simply is not in the set,
 * so a hand-edited URL cannot reach someone else's file — the check falls out
 * of the data rather than needing a separate permission test.
 *
 * Each step fails distinctly so the screen can say which half is missing.
 */

import { getServiceRequestByIdAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import { getDocumentReferenceByIdAction } from "@/modules/server/presentation/actions/document-reference";
import { listDiagnosticReportsAction } from "@/modules/server/presentation/actions/diagnostic-report";
import { contentAttachment } from "@/modules/entities/schemas/document-reference";
import type { TDocumentReferenceContent } from "@/modules/entities/schemas/document-reference";
import type { TPaginatedDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

// ── Types ─────────────────────────────────────────────────────────────────────

/** How many reports to scan when locating an order's results. */
const REPORT_PAGE_LIMIT = 200;

/** The file the preview screen renders. */
export interface PreviewFile {
  /** FileNest fileId — exchanged for a presigned URL on the client. */
  fileId: string;
  /** Filename as stored. */
  title: string | null;
  /** MIME type — decides whether the file can render in-browser. */
  contentType: string | null;
  /** Size in bytes. */
  size: number | null;
  /** ISO datetime the file was uploaded. */
  uploadedAt: string | null;
}

/** Why a resolution failed, or the file when it succeeded. */
export type PreviewResolution =
  | { ok: true; file: PreviewFile; parentLabel: string }
  /** The order or document itself is gone — nothing else was attempted. */
  | { ok: false; reason: "parent-missing"; parentLabel: null }
  /** The parent exists but no longer carries that attachment. */
  | { ok: false; reason: "file-missing"; parentLabel: string }
  /** The query string did not name a resolvable pair. */
  | { ok: false; reason: "bad-request"; parentLabel: null };

/** Query params the preview route understands. */
export interface PreviewParams {
  serviceRequest?: string;
  document?: string;
  attachment?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses a query param as a positive integer id.
 *
 * @param value - Raw query string value.
 * @returns The id, or null when absent or not a positive integer.
 */
function toId(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ── Order results ─────────────────────────────────────────────────────────────

/**
 * Resolves an order result: ServiceRequest → its DiagnosticReports → the file.
 *
 * Reports are listed by patient and filtered on based_on in code. The list
 * endpoint has no based_on filter, and its schema does not accept encounter_id
 * either — passing one is silently dropped — so patient scope plus an in-code
 * filter is the only accurate way to find an order's reports.
 *
 * @param serviceRequestId - The order.
 * @param presentedFormId - The presented_form entry to preview.
 * @param patientId - Patient the order belongs to; scopes the report list.
 */
async function resolveOrderResult(
  serviceRequestId: number,
  presentedFormId: number,
  patientId: number,
): Promise<PreviewResolution> {
  const [order, orderErr] = await getServiceRequestByIdAction({
    payload: { id: serviceRequestId },
  });

  if (orderErr || !order) {
    return { ok: false, reason: "parent-missing", parentLabel: null };
  }

  const parentLabel =
    order.code_display ?? order.code_text ?? `Order ${serviceRequestId}`;

  const [page, pageErr] = await listDiagnosticReportsAction({
    payload: { patient_id: patientId, limit: REPORT_PAGE_LIMIT },
  });

  const reports =
    pageErr || !page
      ? []
      : ((page as TPaginatedDiagnosticReportResponse).data ?? []);

  for (const report of reports) {
    /* Only reports raised against this order. */
    const belongs = (report.based_on ?? []).some(
      (ref) =>
        ref.reference_type === "ServiceRequest" &&
        ref.reference_id === serviceRequestId,
    );
    if (!belongs) continue;

    const entry = (report.presented_form ?? []).find(
      (pf) => pf.id === presentedFormId,
    );
    if (!entry?.url) continue;

    return {
      ok: true,
      parentLabel,
      file: {
        fileId: entry.url,
        title: entry.title ?? null,
        contentType: entry.content_type ?? null,
        size: entry.size ?? null,
        uploadedAt: entry.creation ?? report.created_at ?? null,
      },
    };
  }

  return { ok: false, reason: "file-missing", parentLabel };
}

// ── Encounter documents ───────────────────────────────────────────────────────

/**
 * Resolves an encounter document: DocumentReference → its content entry.
 *
 * @param documentId - The DocumentReference.
 * @param contentId - The content entry to preview.
 */
async function resolveDocument(
  documentId: number,
  contentId: number,
): Promise<PreviewResolution> {
  const [doc, docErr] = await getDocumentReferenceByIdAction({
    payload: { id: documentId },
  });

  if (docErr || !doc) {
    return { ok: false, reason: "parent-missing", parentLabel: null };
  }

  const parentLabel =
    doc.type_display ?? doc.type_text ?? doc.description ?? "Document";

  /* Annotated because the action's return widens content to an untyped array
     when the document is absent, which loses the callback's parameter type. */
  const contents: TDocumentReferenceContent[] = doc.content ?? [];
  const entry = contents.find((c) => c.id === contentId);
  /* contentAttachment normalises the flat attachment_* fields fhir-server
     actually returns; reading entry.attachment directly finds nothing. */
  const attachment = entry ? contentAttachment(entry) : null;

  if (!attachment?.url) {
    return { ok: false, reason: "file-missing", parentLabel };
  }

  return {
    ok: true,
    parentLabel,
    file: {
      fileId: attachment.url,
      title: attachment.title ?? doc.description ?? null,
      contentType: attachment.content_type ?? null,
      size: attachment.size ?? null,
      uploadedAt: attachment.creation ?? doc.created_at ?? null,
    },
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Resolves the preview query params to a single file.
 *
 * @param params - Raw query params from the route.
 * @param patientId - Patient whose chart is open; scopes the order lookup.
 * @returns The file, or why it could not be resolved.
 */
export async function resolvePreviewFile(
  params: PreviewParams,
  patientId: number,
): Promise<PreviewResolution> {
  const attachmentId = toId(params.attachment);
  if (attachmentId == null) {
    return { ok: false, reason: "bad-request", parentLabel: null };
  }

  const serviceRequestId = toId(params.serviceRequest);
  if (serviceRequestId != null) {
    return resolveOrderResult(serviceRequestId, attachmentId, patientId);
  }

  const documentId = toId(params.document);
  if (documentId != null) {
    return resolveDocument(documentId, attachmentId);
  }

  return { ok: false, reason: "bad-request", parentLabel: null };
}
