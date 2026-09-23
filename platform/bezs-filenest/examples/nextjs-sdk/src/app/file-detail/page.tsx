"use client";

/**
 * /file-detail — useFile() hook demo.
 *
 * Single-file detail card with version history and processing results.
 */

import { useFile } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import { useState } from "react";

const SOURCE = `"use client";
import { useFile } from "@filenest/react";

export function FileDetail({ fileId }: { fileId: string }) {
  const {
    file,
    isLoading,
    isError,
    error,
    mutate,  // TanStack Query mutate — call after an external update
  } = useFile(fileId, {
    includeVersions: true,
    includeProcessing: true,
  });

  if (isLoading) return <p>Loading…</p>;
  if (isError)  return <p>Error: {error?.message}</p>;
  if (!file)    return null;

  return (
    <div>
      <h2>{file.filename}</h2>
      <dl>
        <dt>Status</dt><dd>{file.status}</dd>
        <dt>Size</dt>  <dd>{file.sizeBytes} bytes</dd>
        <dt>MIME</dt>  <dd>{file.contentType}</dd>
        <dt>Tags</dt>  <dd>{file.tags.join(", ") || "none"}</dd>
      </dl>
      {file.versions && (
        <ul>
          {file.versions.map(v => (
            <li key={v.versionNumber}>v{v.versionNumber} — {v.sizeBytes} bytes</li>
          ))}
        </ul>
      )}
      <button onClick={() => mutate()}>Refetch</button>
    </div>
  );
}`;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
        fontSize: 14,
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "monospace", maxWidth: "60%", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function FileDetailCard({ fileId }: { fileId: string }) {
  const { file, isLoading, isError, error, mutate } = useFile(fileId, {
    includeVersions: true,
    includeProcessing: true,
  });

  if (isLoading) {
    return (
      <div className="card-body text-sm text-muted">Loading file…</div>
    );
  }
  if (isError) {
    return (
      <div className="card-body">
        <p className="text-sm" style={{ color: "var(--error)" }}>{error?.message}</p>
      </div>
    );
  }
  if (!file) return null;

  return (
    <>
      <div className="card-body flex flex-col gap-1">
        <DetailRow label="File ID" value={file.id} />
        <DetailRow label="Filename" value={file.filename} />
        <DetailRow label="Status" value={
          <span className={`badge ${file.status === "ready" ? "badge-green" : file.status === "processing" ? "badge-blue" : "badge-red"}`}>
            {file.status}
          </span>
        } />
        <DetailRow label="Size" value={formatBytes(file.sizeBytes)} />
        <DetailRow label="MIME type" value={file.contentType} />
        <DetailRow label="Folder" value={file.folderId ?? "root"} />
        <DetailRow label="Tags" value={file.tags.length ? file.tags.join(", ") : "—"} />
        <DetailRow label="Created" value={new Date(file.createdAt).toLocaleString()} />
        <DetailRow label="Updated" value={new Date(file.updatedAt).toLocaleString()} />
        {Object.keys(file.metadata ?? {}).length > 0 && (
          <DetailRow label="Metadata" value={
            <pre style={{ fontSize: 11, margin: 0 }}>
              {JSON.stringify(file.metadata, null, 2)}
            </pre>
          } />
        )}
      </div>

      {file.versions && file.versions.length > 0 && (
        <>
          <div className="card-header" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="card-title">Version history</div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Size</th>
                <th>Created</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {file.versions.map((v) => (
                <tr key={v.versionNumber}>
                  <td>v{v.versionNumber}</td>
                  <td className="text-muted">{formatBytes(v.sizeBytes)}</td>
                  <td className="text-muted">{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td className="text-muted">{v.changeNote ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="card-body">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => mutate()}>
          Refetch
        </button>
      </div>
    </>
  );
}

export default function FileDetailPage() {
  const [fileId, setFileId] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useFile hook</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Fetches a single file record with metadata, version history, and processing results.
          Backed by TanStack Query — call <code>mutate()</code> to refetch after an external
          mutation.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Look up a file</div>
              <div className="card-desc">Enter a file ID from your project</div>
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
                onClick={() => setActiveId(fileId.trim() || null)}
                disabled={!fileId.trim()}
              >
                Fetch
              </button>
            </div>
            {activeId && <FileDetailCard fileId={activeId} />}
          </div>
        </div>

        <CodeBlock title="file-detail/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
