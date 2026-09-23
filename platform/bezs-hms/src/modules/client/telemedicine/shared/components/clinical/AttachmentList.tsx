/**
 * AttachmentList — downloadable files hanging off a clinical resource.
 *
 * Layer: client / telemedicine / shared / components / clinical
 *
 * DocumentReference (`content[].attachment`) and DiagnosticReport
 * (`presented_form[]`) both store files as the same FHIR Attachment shape, so
 * one component renders both. Flattening to `Attachment` at the call site keeps
 * this from having to know which resource it came from.
 *
 * `attachment.url` is a FileNest fileId, not a fetchable URL — it must be
 * exchanged for a short-lived presigned URL at click time. Requesting eagerly
 * would mint a URL for every file on every page load and let those links leak
 * into the HTML.
 *
 * Two actions per file, matching DoctorReportSection: View opens the file in a
 * new tab, Download saves it. The difference is entirely the `disposition` the
 * presign is requested with — `inline` vs `attachment` — which is why both go
 * through the same fetch.
 *
 * Client component: both actions are click handlers with their own busy state.
 */

"use client";

import { useState } from "react";
import { Download, Eye, Loader2, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "./clinicalFormat";

// ── Types ─────────────────────────────────────────────────────────────────────

/** One file attached to a clinical resource. */
export interface Attachment {
  /** Stable React key, unique within the list. */
  key: string;
  /** FileNest fileId — exchanged for a presigned URL on download. */
  fileId: string | null;
  /** Filename as uploaded. */
  title: string | null;
  /** MIME type, used for the extension chip when the filename has none. */
  contentType: string | null;
  /** Size in bytes. */
  size: number | null;
  /** ISO datetime the file was created or uploaded. */
  uploadedAt: string | null;
  /** Extra context line, e.g. the document type or issuing lab. */
  detail: string | null;
  /**
   * Id of this attachment *within its parent resource* — a DiagnosticReport's
   * presented_form id, or a DocumentReference's content id.
   *
   * Used to build preview links. Absent for lists with no preview route, and
   * for records that predate the id being returned.
   */
  previewId?: number | null;
  /**
   * Id of the resource that owns this attachment — the DocumentReference, or
   * the ServiceRequest an order result was raised against.
   *
   * Needed where a list is flattened across several parents, so the owner
   * cannot be captured from the surrounding scope.
   */
  previewParentId?: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a byte count as a human-readable size.
 *
 * @param bytes - Raw byte count.
 * @returns e.g. "1.4 MB", or an empty string when unknown.
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Derives a short uppercase type label from a filename or MIME type.
 *
 * @param title - Filename.
 * @param contentType - MIME type.
 * @returns Short label for the chip, e.g. "PDF".
 */
export function fileExtension(
  title?: string | null,
  contentType?: string | null,
): string {
  if (title) {
    const ext = title.split(".").pop();
    if (ext && ext.length <= 5 && ext !== title) return ext.toUpperCase();
  }
  if (contentType) {
    if (contentType.includes("pdf")) return "PDF";
    const subtype = contentType.split("/")[1];
    if (subtype) return subtype.split(";")[0].toUpperCase().slice(0, 5);
  }
  return "FILE";
}

/** What the user asked to do with a file. */
export type AttachmentAction = "view" | "download";

/**
 * Exchanges a FileNest fileId for a short-lived presigned URL.
 *
 * The disposition is what makes the same file open in a tab or land in the
 * downloads folder — it is set on the presign, not on the anchor, because a
 * cross-origin `download` attribute is ignored by browsers.
 *
 * @param fileId - FileNest fileId stored on the attachment.
 * @param disposition - "inline" to render in the browser, "attachment" to save.
 * @returns The presigned URL.
 * @throws When the presign request fails.
 */
export async function getAttachmentUrl(
  fileId: string,
  disposition: "inline" | "attachment",
): Promise<string> {
  const res = await fetch(
    `/api/filenest-download-url?fileId=${encodeURIComponent(fileId)}&disposition=${disposition}`,
  );
  if (!res.ok) throw new Error("Failed to get file link");
  const { url } = (await res.json()) as { url: string };
  return url;
}

/**
 * Opens a file in a new tab, or saves it to disk.
 *
 * A file the browser cannot render inline (a .docx, say) falls back to
 * downloading when viewed. That is the browser's own behaviour and it is left
 * alone deliberately — guessing viewability from a nullable `content_type`
 * would hide View from PDFs whose type was never recorded, which is the worse
 * failure.
 *
 * @param fileId - FileNest fileId stored on the attachment.
 * @param action - "view" opens inline; "download" saves it.
 * @param title - Filename hint for the download dialog.
 * @throws When the presign request fails; callers surface the toast.
 */
export async function openAttachment(
  fileId: string,
  action: AttachmentAction,
  title?: string | null,
): Promise<void> {
  const url = await getAttachmentUrl(
    fileId,
    action === "view" ? "inline" : "attachment",
  );

  if (action === "view") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = title ?? "document";
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AttachmentListProps {
  /** Files to list. */
  attachments: Attachment[];
  /** Shown when the list is empty; omit to render nothing at all. */
  emptyLabel?: string;
  /**
   * Builds the link to the full-screen analysis view of a file, or returns
   * null for files that have none.
   *
   * Optional so the lists with no analysis route — appointment reports, the
   * patient's medical records — are untouched. When supplied, an Analyse
   * action appears alongside View and Download.
   */
  previewHref?: (attachment: Attachment) => string | null;
}

/**
 * Renders a list of downloadable attachments.
 *
 * @param attachments - Files to list.
 * @param emptyLabel - Message for the empty case.
 */
export function AttachmentList({
  attachments,
  emptyLabel,
  previewHref,
}: AttachmentListProps) {
  /**
   * Which file is mid-request and for which action. Keyed by attachment rather
   * than a single boolean so two files in the same list spin independently.
   */
  const [busy, setBusy] = useState<{
    key: string;
    action: AttachmentAction;
  } | null>(null);

  /**
   * Runs a file action, holding a spinner on the button until the presign
   * resolves — minting the URL is a network round trip, so an unacknowledged
   * click reads as a dead button.
   *
   * @param file - The attachment acted on.
   * @param action - "view" or "download".
   */
  async function handleAction(file: Attachment, action: AttachmentAction) {
    if (!file.fileId) return;

    setBusy({ key: file.key, action });
    try {
      await openAttachment(file.fileId, action, file.title);
    } catch {
      toast.error(
        action === "view"
          ? "Could not open the file. Please try again."
          : "Could not get a download link. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (attachments.length === 0) {
    return emptyLabel ? (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {attachments.map((file) => {
        const isViewing = busy?.key === file.key && busy.action === "view";
        const isDownloading =
          busy?.key === file.key && busy.action === "download";

        return (
          <div
            key={file.key}
            className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5"
          >
            <Badge
              variant="secondary"
              className="min-w-13 shrink-0 justify-center font-mono text-[10px]"
            >
              {fileExtension(file.title, file.contentType)}
            </Badge>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">
                {file.title ?? "Untitled"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[
                  file.detail,
                  formatBytes(file.size),
                  file.uploadedAt ? formatDate(file.uploadedAt) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            {file.fileId && (
              <div className="flex shrink-0 items-center gap-1">
                {/* Analyse leads — it is the fuller action, and View and
                    Download remain for reading elsewhere or keeping a copy.
                    Named for what distinguishes it: "Preview" sat beside "View"
                    as a synonym, giving the two most similar labels to the two
                    most different actions.

                    Sparkles is the icon people already read as "AI" — it says
                    what is behind this action before the label is read, and
                    matches the marker used on the panels it opens. */}
                {(() => {
                  const href = previewHref?.(file);
                  return href ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                    >
                      <Link href={href}>
                        <Sparkles className="size-3" />
                        Analyse
                      </Link>
                    </Button>
                  ) : null;
                })()}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  disabled={isViewing}
                  onClick={() => void handleAction(file, "view")}
                >
                  {isViewing ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Eye className="size-3" />
                  )}
                  View
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  disabled={isDownloading}
                  onClick={() => void handleAction(file, "download")}
                >
                  {isDownloading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Download className="size-3" />
                  )}
                  Download
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
