/**
 * @filenest/react components/FilePreview — inline file preview panel.
 *
 * Renders images inline and PDFs via iframe. Full PDF.js integration
 * and Office preview are deferred to Phase 7.
 *
 * @module
 */

import React from "react";
import type { FileRecord } from "@filenest/core";
import { useFile } from "../hooks/useFile.js";
import { useFileNest } from "../context/FileNestContext.js";

export interface FilePreviewProps {
  fileId: string;
  showMetadata?: boolean;
  showVersionHistory?: boolean;
  allowDownload?: boolean;
  downloadTtl?: number;
  height?: string | number;
  width?: string | number;
  onClose?: () => void;
  onDownload?: (url: string) => void;
  onVersionSelect?: (versionNumber: number) => void;
}

export function FilePreview({
  fileId,
  showMetadata = true,
  showVersionHistory = false,
  allowDownload = true,
  height = 480,
  width = "100%",
  onClose,
  onDownload,
}: FilePreviewProps) {
  const { file, isLoading } = useFile(fileId, { includeVersions: showVersionHistory });
  const { projectId, baseUrl, getToken } = useFileNest();

  const handleDownload = async () => {
    const token = await getToken();
    const res = await fetch(`${baseUrl}/v1/projects/${projectId}/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { url } = (await res.json()) as { url: string };
    if (onDownload) {
      onDownload(url);
    } else {
      window.open(url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height, width }}>
        <span style={{ color: "#9ca3af" }}>Loading preview…</span>
      </div>
    );
  }

  if (!file) return null;

  return (
    <div style={{ width, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{file.filename}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {allowDownload && (
            <button type="button" style={headerBtn} onClick={handleDownload}>Download</button>
          )}
          {onClose && <button type="button" style={headerBtn} onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* Preview area */}
      <PreviewContent file={file} height={typeof height === "number" ? height - 44 : 360} projectId={projectId} baseUrl={baseUrl} getToken={getToken} />

      {/* Metadata */}
      {showMetadata && Object.keys(file.metadata ?? {}).length > 0 && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Metadata</p>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 12px" }}>
            {Object.entries(file.metadata).map(([k, v]) => (
              <React.Fragment key={k}>
                <dt style={{ fontSize: 12, color: "#6b7280" }}>{k}</dt>
                <dd style={{ margin: 0, fontSize: 12 }}>{String(v)}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function PreviewContent({
  file,
  height,
  projectId,
  baseUrl,
  getToken,
}: {
  file: FileRecord;
  height: number;
  projectId: string;
  baseUrl: string;
  getToken: () => Promise<string>;
}) {
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    getToken()
      .then((token) =>
        fetch(`${baseUrl}/v1/projects/${projectId}/files/${file.id}/download`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((r) => r.json())
      .then((d: { url: string }) => setDownloadUrl(d.url))
      .catch(() => {});
  }, [file.id, projectId, getToken]);

  if (!downloadUrl) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (file.contentType.startsWith("image/")) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
        <img src={downloadUrl} alt={file.filename} style={{ maxWidth: "100%", maxHeight: height, objectFit: "contain" }} />
      </div>
    );
  }

  if (file.contentType === "application/pdf") {
    return <iframe src={downloadUrl} title={file.filename} style={{ width: "100%", height, border: "none" }} />;
  }

  return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 32 }}>📄</span>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{file.contentType} — no preview available</span>
    </div>
  );
}

const headerBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid #d1d5db",
  borderRadius: 5,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
};
