"use client";

/**
 * /file-preview — FilePreview component demo.
 *
 * Inline preview panel. Images render directly; PDFs load via iframe.
 * Enter a file ID to preview it.
 */

import { FilePreview } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import { useState } from "react";

const SOURCE = `"use client";
import { FilePreview } from "@filenest/react";

export function PreviewDemo({ fileId }: { fileId: string }) {
  return (
    <FilePreview
      fileId={fileId}
      showMetadata={true}
      showVersionHistory={true}
      allowDownload={true}
      downloadTtl={3600}
      height={480}
      width="100%"
      onClose={() => setFileId(null)}
      onDownload={(url) => window.open(url, "_blank")}
    />
  );
}`;

export default function FilePreviewPage() {
  const [fileId, setFileId] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>FilePreview</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Inline preview panel. Images render directly; PDFs load via iframe.
          Full PDF.js and Office document support are added in Phase 7.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Preview a file</div>
              <div className="card-desc">Enter a file ID from your project</div>
            </div>
            <div className="card-body flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  className="input w-full"
                  placeholder="file_abc123..."
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setPreviewId(fileId.trim() || null)}
                  disabled={!fileId.trim()}
                >
                  Preview
                </button>
              </div>

              {previewId ? (
                <FilePreview
                  fileId={previewId}
                  showMetadata
                  showVersionHistory
                  allowDownload
                  downloadTtl={3600}
                  height={400}
                  width="100%"
                  onClose={() => setPreviewId(null)}
                  onDownload={(url) => window.open(url, "_blank")}
                />
              ) : (
                <div
                  style={{
                    height: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg)",
                    borderRadius: 8,
                    border: "1px dashed var(--border)",
                  }}
                >
                  <p className="text-sm text-muted">Enter a file ID to see the preview</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Supported preview types</div></div>
            <table className="table">
              <thead><tr><th>Type</th><th>How</th></tr></thead>
              <tbody>
                {[
                  ["image/*", "Inline <img> with signed download URL"],
                  ["application/pdf", "<iframe> with signed download URL"],
                  ["text/*", "Inline <pre> block"],
                  ["Other", "Filename + type badge, no visual preview"],
                ].map(([type, how]) => (
                  <tr key={type}>
                    <td className="font-mono text-sm">{type}</td>
                    <td className="text-sm text-muted">{how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CodeBlock title="file-preview/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
