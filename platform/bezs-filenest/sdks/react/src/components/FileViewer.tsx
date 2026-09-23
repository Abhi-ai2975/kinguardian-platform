/**
 * @filenest/react components/FileViewer — full-page document viewer wrapper.
 *
 * Wraps FilePreview with fullscreen/contained layout chrome and an optional
 * toolbar. Full PDF.js and annotation support are deferred to Phase 7.
 *
 * @module
 */

import React from "react";
import { FilePreview } from "./FilePreview.js";

export interface PdfViewerOptions {
  showPageNumbers?: boolean;
  enableSearch?: boolean;
  enableZoom?: boolean;
  defaultZoom?: "fit-width" | "fit-page" | "auto";
}

export interface ImageViewerOptions {
  enableZoom?: boolean;
  enableRotate?: boolean;
}

export interface FileViewerProps {
  fileId: string;
  showToolbar?: boolean;
  showSidebar?: boolean;
  pdf?: PdfViewerOptions;
  image?: ImageViewerOptions;
  layout?: "fullscreen" | "contained";
  onClose?: () => void;
}

export function FileViewer({
  fileId,
  showToolbar = true,
  layout = "contained",
  onClose,
}: FileViewerProps) {
  const containerStyle: React.CSSProperties =
    layout === "fullscreen"
      ? { position: "fixed", inset: 0, background: "#111827", zIndex: 9999, display: "flex", flexDirection: "column" }
      : { width: "100%", height: "100%", display: "flex", flexDirection: "column" };

  return (
    <div style={containerStyle}>
      {showToolbar && onClose && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", background: "#1f2937" }}>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
      )}
      <div style={{ flex: 1, overflow: "auto" }}>
        <FilePreview
          fileId={fileId}
          showMetadata={false}
          showVersionHistory={false}
          allowDownload={true}
          height="100%"
          width="100%"
          onClose={onClose}
        />
      </div>
    </div>
  );
}
