/**
 * FilePreviewPane — renders the file itself, left of the split.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * `attachment.url` holds a FileNest fileId, not a fetchable URL, so the file
 * cannot be rendered until that id is exchanged for a short-lived presigned URL.
 * That exchange happens here on mount, with `inline` disposition — the same
 * presign the View action uses, which is what makes a browser display the file
 * rather than download it.
 *
 * The link expires after an hour. A preview left open on a second monitor would
 * otherwise go blank with no explanation, so the pane tracks its own age and
 * offers a reload rather than failing silently.
 *
 * Not every file can be shown: a .docx has no in-browser renderer, so those
 * get an honest fallback with the download instead of an empty frame. DICOM
 * is the exception that does render — see DicomCanvas for how, since a
 * browser has no built-in decoder for it the way it does for PDFs and photos.
 *
 * Zoom is shared across the image and DICOM renderers (useZoom + ZoomControls)
 * rather than built twice: it's a CSS transform on whichever renderer's output
 * is on screen, not something either renderer needs to know about.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, FileQuestion, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getAttachmentUrl,
  openAttachment,
} from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import { DicomCanvas } from "./DicomCanvas";
import { PaneMessage } from "./PaneMessage";
import { ZoomControls } from "./ZoomControls";
import { useZoom } from "./useZoom";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * When to warn that the presigned link is stale.
 *
 * FileNest mints these for an hour; refreshing a little before that avoids the
 * frame going blank mid-read.
 */
const LINK_TTL_MS = 55 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface FilePreviewPaneProps {
  /** FileNest fileId to render. */
  fileId: string;
  /** Filename, used for the download and the fallback message. */
  title: string | null;
  /** MIME type — decides which renderer applies. */
  contentType: string | null;
}

/** How a file can be shown, if at all. */
type Renderer = "pdf" | "image" | "dicom" | "unsupported";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Picks a renderer from the MIME type, falling back to the filename extension.
 *
 * `content_type` is nullable in this data, so a PDF whose type was never
 * recorded would otherwise be treated as unpreviewable. DICOM has no single
 * standard MIME type in the wild — `application/dicom` is the registered one,
 * but most PACS exports carry none at all — so the `.dcm`/`.dicom` extension
 * is the more reliable signal for it specifically.
 *
 * @param contentType - MIME type, when known.
 * @param title - Filename, used when the MIME type is missing.
 * @returns Which renderer to use.
 */
export function pickRenderer(
  contentType: string | null,
  title: string | null,
): Renderer {
  const type = contentType?.toLowerCase() ?? "";
  if (type.includes("pdf")) return "pdf";
  if (type.includes("dicom")) return "dicom";
  if (type.startsWith("image/")) return "image";

  const ext = title?.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "dcm" || ext === "dicom") return "dicom";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) {
    return "image";
  }
  return "unsupported";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a file inline, or explains why it cannot be.
 *
 * @param fileId - FileNest fileId.
 * @param title - Filename.
 * @param contentType - MIME type.
 */
export function FilePreviewPane({
  fileId,
  title,
  contentType,
}: FilePreviewPaneProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isStale, setIsStale] = useState(false);
  /** Bumped to re-run the fetch; the reload buttons change this rather than
      calling the effect's work directly. */
  const [attempt, setAttempt] = useState(0);

  const renderer = pickRenderer(contentType, title);

  /** Requests a fresh link. */
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  /* Shared between the image and DICOM renderers — see the file header. */
  const zoom = useZoom();

  /* A fresh file should always open at 100%, not wherever the previous one's
     zoom was left. */
  useEffect(() => {
    zoom.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  useEffect(() => {
    /* Unsupported types never need a URL — the fallback downloads on demand. */
    if (renderer === "unsupported") return;

    /* Guards against a slow response for a previous file landing after the
       component has moved on, which would show the wrong document. */
    let cancelled = false;

    void (async () => {
      try {
        const next = await getAttachmentUrl(fileId, "inline");
        if (cancelled) return;
        setUrl(next);
        setError(false);
        setIsStale(false);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileId, renderer, attempt]);

  /* Mark the link stale shortly before FileNest expires it. */
  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(() => setIsStale(true), LINK_TTL_MS);
    return () => clearTimeout(timer);
  }, [url]);

  // ── Unsupported ────────────────────────────────────────────────────────────
  if (renderer === "unsupported") {
    return (
      <PaneMessage
        icon={<FileQuestion className="size-9 opacity-40" />}
        title="This file can't be previewed here"
        body={`${title ?? "The file"} isn't a format the browser can display. Download it to open in another application.`}
        action={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => void openAttachment(fileId, "download", title)}
          >
            <Download className="size-3.5" />
            Download
          </Button>
        }
      />
    );
  }

  // ── Failed to mint a link ──────────────────────────────────────────────────
  if (error) {
    return (
      <PaneMessage
        icon={<AlertCircle className="size-9 opacity-40" />}
        title="Couldn't load the file"
        body="The secure link could not be created. This is usually temporary."
        action={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={reload}
          >
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        }
      />
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!url) {
    return (
      <PaneMessage
        icon={<Loader2 className="size-8 animate-spin opacity-50" />}
        title="Preparing preview…"
      />
    );
  }

  // ── Rendered ───────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full bg-muted/30">
      {isStale && (
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 border-b bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
          <AlertCircle className="size-3.5 shrink-0" />
          <span className="flex-1">
            This preview link has expired.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 text-[11px]"
            onClick={reload}
          >
            <RefreshCw className="size-3" />
            Reload
          </Button>
        </div>
      )}

      {renderer === "pdf" && (
        /* The browser's own PDF viewer already has zoom, so ZoomControls
           stays out of this branch rather than fighting it with a second,
           conflicting zoom. */
        <iframe
          src={url}
          title={title ?? "Document preview"}
          className="size-full border-0"
        />
      )}

      {renderer === "image" && (
        <>
          <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
            {/* Transform lives directly on the img — a wrapping div with no
                explicit height would break max-h-full's percentage basis,
                since that percentage resolves against the nearest ancestor
                with a real height, which is this flex container, not an
                unsized div inserted between them. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned
                FileNest URL; next/image cannot optimise an expiring remote host. */}
            <img
              src={url}
              alt={title ?? "Document preview"}
              style={{ transform: `scale(${zoom.scale})` }}
              className="max-h-full max-w-full origin-center object-contain transition-transform duration-150"
            />
          </div>
          <ZoomControls zoom={zoom} />
        </>
      )}

      {renderer === "dicom" && (
        <>
          <div
            style={{ transform: `scale(${zoom.scale})` }}
            className="h-full w-full origin-center transition-transform duration-150"
          >
            {/* Keyed on fileId so switching files remounts this component
                rather than needing an internal effect to reset its decode
                state — see DicomCanvas's own effect comment. */}
            <DicomCanvas key={fileId} url={url} fileId={fileId} title={title} />
          </div>
          <ZoomControls zoom={zoom} />
        </>
      )}
    </div>
  );
}
