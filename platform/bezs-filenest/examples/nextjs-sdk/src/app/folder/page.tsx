"use client";

/**
 * /folder — useFolder() hook demo.
 *
 * Folder navigation with breadcrumb trail, subfolder grid, and file list.
 * Clicking a subfolder card navigates into it by updating the active folder ID.
 */

import { useFolder } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import { useState } from "react";

const SOURCE = `"use client";
import { useFolder } from "@filenest/react";

export function FolderNavigator() {
  const [folderId, setFolderId] = useState<string | null>(null);

  const { folder, files, subfolders, isLoading, breadcrumbs } = useFolder(folderId);

  return (
    <div>
      {/* Breadcrumbs */}
      <nav>
        <button onClick={() => setFolderId(null)}>Root</button>
        {breadcrumbs.map(b => (
          <button key={b.id} onClick={() => setFolderId(b.id)}>
            {b.name}
          </button>
        ))}
      </nav>

      {/* Subfolders */}
      {subfolders.map(f => (
        <div key={f.id} onClick={() => setFolderId(f.id)}>
          📁 {f.name} ({f.fileCount} files)
        </div>
      ))}

      {/* Files */}
      {files.map(file => (
        <div key={file.id}>{file.filename}</div>
      ))}
    </div>
  );
}`;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function FolderView({
  folderId,
  onNavigate,
}: {
  folderId: string | null;
  onNavigate: (id: string | null) => void;
}) {
  const { folder, files, subfolders, isLoading, breadcrumbs } = useFolder(folderId);

  if (isLoading) {
    return <div className="card-body text-sm text-muted">Loading folder…</div>;
  }

  return (
    <>
      {/* Breadcrumbs */}
      <div className="card-body" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-1 flex-wrap text-sm">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => onNavigate(null)}
            style={folderId === null ? { opacity: 0.5, pointerEvents: "none" } : {}}
          >
            Root
          </button>
          {breadcrumbs.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1">
              <span className="text-muted">/</span>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => onNavigate(b.id)}
                style={i === breadcrumbs.length - 1 ? { opacity: 0.5, pointerEvents: "none" } : {}}
              >
                {b.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Subfolders */}
      {subfolders.length > 0 && (
        <div className="card-body">
          <div className="card-desc mb-2">Subfolders</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            {subfolders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onNavigate(f.id)}
                style={{
                  padding: "12px 14px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>📁</div>
                <div className="text-sm" style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </div>
                <div className="text-sm text-muted">{f.fileCount ?? 0} files</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length === 0 && subfolders.length === 0 ? (
        <div className="card-body text-sm text-muted">This folder is empty.</div>
      ) : files.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th>Type</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td className="truncate" style={{ maxWidth: 200 }}>{f.filename}</td>
                <td className="text-muted">{formatBytes(f.size)}</td>
                <td className="text-muted text-sm">{f.mimeType.split("/")[1] ?? f.mimeType}</td>
                <td className="text-muted text-sm">{f.tags.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {/* Current folder metadata */}
      {folder && (
        <div className="card-body" style={{ borderTop: "1px solid var(--border)" }}>
          <pre className="code-block" style={{ fontSize: 11, margin: 0 }}>
            {JSON.stringify({ id: folder.id, name: folder.name, fileCount: folder.fileCount }, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

export default function FolderPage() {
  const [folderId, setFolderId] = useState<string | null>(null);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useFolder hook</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Fetches a folder, its direct files, and its subfolders in parallel via three TanStack
          Query requests. Navigating into a subfolder updates the active ID and re-runs all three
          queries — breadcrumbs update automatically.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                {folderId ? "Folder contents" : "Root folder"}
              </div>
              <div className="card-desc">Click a subfolder to navigate into it</div>
            </div>
            <FolderView folderId={folderId} onNavigate={setFolderId} />
          </div>
        </div>

        <CodeBlock title="folder/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
