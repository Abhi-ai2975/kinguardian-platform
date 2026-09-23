"use client";

/**
 * /file-viewer — FileViewer component demo.
 *
 * Full-page viewer wrapper around FilePreview with toolbar chrome.
 */

import { FileViewer } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import { useState } from "react";

const SOURCE = `"use client";
import { FileViewer } from "@filenest/react";

export function ViewerDemo({ fileId }: { fileId: string }) {
  return (
    <FileViewer
      fileId={fileId}
      showToolbar={true}
      showSidebar={true}
      pdf={{
        showPageNumbers: true,
        enableSearch: true,
        enableZoom: true,
        defaultZoom: "fit-width",
      }}
      image={{
        enableZoom: true,
        enableRotate: true,
      }}
      layout="contained"   // or "fullscreen"
      onClose={() => router.back()}
    />
  );
}`;

export default function FileViewerPage() {
  const [fileId, setFileId] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);

  if (viewerId) {
    return (
      <div style={{ height: "calc(100vh - 72px)" }}>
        <FileViewer
          fileId={viewerId}
          showToolbar
          layout="contained"
          onClose={() => setViewerId(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>FileViewer</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Full-page viewer with a close toolbar. Use <code>layout=&quot;fullscreen&quot;</code> to
          take over the entire viewport, or <code>&quot;contained&quot;</code> to embed inside a panel.
          PDF.js zoom/search annotations come in Phase 7.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Open file in viewer</div>
              <div className="card-desc">Enter a file ID — the viewer replaces this page</div>
            </div>
            <div className="card-body flex gap-2">
              <input
                className="input w-full"
                placeholder="file_abc123..."
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setViewerId(fileId.trim() || null)}
                disabled={!fileId.trim()}
              >
                Open viewer
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Props reference</div></div>
            <table className="table">
              <thead><tr><th>Prop</th><th>Description</th></tr></thead>
              <tbody>
                {[
                  ["fileId", "ID of the file to view"],
                  ["showToolbar", "Show close button and download action in header"],
                  ["layout", '"contained" | "fullscreen" — fullscreen overlays the viewport'],
                  ["pdf.defaultZoom", '"fit-width" | "fit-page" | "auto"'],
                  ["image.enableZoom", "Pinch-to-zoom and scroll zoom on image files"],
                  ["onClose", "Called when user clicks the close button"],
                ].map(([prop, desc]) => (
                  <tr key={prop}>
                    <td className="font-mono text-sm">{prop}</td>
                    <td className="text-sm text-muted">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CodeBlock title="file-viewer/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
