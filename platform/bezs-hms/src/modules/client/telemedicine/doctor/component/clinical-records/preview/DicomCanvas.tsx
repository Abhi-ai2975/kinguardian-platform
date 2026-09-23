/**
 * DicomCanvas — decodes and renders a DICOM file to a canvas.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * Browsers have no native DICOM decoder, so unlike the image renderer this
 * needs an extra step: download the file's bytes, parse them with dicom.ts,
 * then paint the decoded pixel data to a canvas via WebGL. That decode step
 * gets its own loading/error states, separate from FilePreviewPane's — the
 * parent's states cover getting the presigned link, these cover turning the
 * bytes behind it into pixels.
 *
 * dicom.ts is loaded with a dynamic import rather than a static one. It pulls
 * in a WebGL renderer, a JPEG-LS/lossless decoder and a zlib inflate — weight
 * no other renderer on this pane needs, so it should not be in the bundle for
 * a doctor who only ever opens PDFs and photos. It also touches `canvas`/`gl`
 * only inside function bodies, so the dynamic import is purely a bundle-size
 * choice, not a requirement for SSR safety.
 *
 * dicom.ts's free `render(image, canvas)` helper creates its own Renderer,
 * sizes the canvas to the image's own pixel dimensions, draws the frame and
 * destroys the WebGL context again in one call — there is nothing here to
 * clean up manually, and no context accumulates across files.
 *
 * Renders frame 0 only. A multi-frame DICOM (an ultrasound cine loop, for
 * instance) will preview its first frame with no scrubber — acceptable for a
 * result-review pane, but worth knowing if a multi-frame study ever looks
 * "frozen".
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openAttachment } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import { PaneMessage } from "./PaneMessage";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DicomCanvasProps {
  /** Presigned URL to fetch the raw DICOM bytes from — already resolved by FilePreviewPane. */
  url: string;
  /** FileNest fileId, for the download fallback on decode failure. */
  fileId: string;
  /** Filename, for the fallback message. */
  title: string | null;
}

/** Decode/render stage, independent of FilePreviewPane's own link-fetch state. */
type Stage = "loading" | "ready" | "error";

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Fetches, decodes and paints one DICOM file to a canvas.
 *
 * @param url - Presigned URL to the raw file bytes.
 * @param fileId - FileNest fileId, used only for the download fallback.
 * @param title - Filename, used only for the download fallback.
 */
export function DicomCanvas({ url, fileId, title }: DicomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stage, setStage] = useState<Stage>("loading");

  useEffect(() => {
    /* Guards against a slow decode for a previous file landing after the
       component has moved on to the next one — the same race FilePreviewPane
       already guards for its own link fetch.
       No synchronous setStage("loading") reset here: FilePreviewPane keys
       this component on fileId, so switching files remounts it and "loading"
       is simply the initial state again. A same-file link refresh (a stale
       presigned URL renewing) reuses this instance and its `url` prop
       changes, re-running this effect — but the last decoded frame stays on
       screen through that refetch rather than flashing back to a spinner,
       which reads better and matches how the image renderer already handles
       the same refresh. */
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        /* Dynamic import — see the file header for why. */
        const { default: dicomts } = await import("dicom.ts");
        const image = dicomts.parseImage(buffer);
        if (!image) throw new Error("Not a recognisable DICOM file");

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        await dicomts.render(image, canvas);
        if (cancelled) return;

        setStage("ready");
      } catch {
        if (!cancelled) setStage("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (stage === "error") {
    return (
      <PaneMessage
        icon={<AlertCircle className="size-9 opacity-40" />}
        title="Couldn't render this DICOM file"
        body={`${title ?? "The file"} could not be decoded. It may use a transfer syntax this viewer doesn't support — download it to open in a DICOM viewer.`}
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

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-auto bg-black/90 p-4">
      {stage === "loading" && (
        <Loader2 className="absolute size-8 animate-spin text-white/60" />
      )}
      {/* Sized to the image's own pixel dimensions by dicom.ts; h-auto/w-auto
          keeps that aspect ratio while max-h/max-w fit it to the pane —
          canvas has no object-fit equivalent, so both must be set together. */}
      <canvas
        ref={canvasRef}
        className={
          stage === "ready"
            ? "h-auto max-h-full w-auto max-w-full"
            : "hidden"
        }
      />
    </div>
  );
}
