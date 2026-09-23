"use client";

/**
 * /headless-upload — useFileNest() headless API demo.
 *
 * Shows all three upload tiers side-by-side:
 *   Tier 1: <FileUpload /> drop-in component
 *   Tier 2: useUpload() managed hook
 *   Tier 3: useFileNest() raw imperative methods (initUpload, uploadToStorage, confirmUpload)
 *
 * Also demonstrates folder methods: ensurePath, createFolder, listFolders, getFolderByPath.
 */

import { useFileNest } from "@filenest/react";
import { useState, useRef } from "react";
import { CodeBlock } from "@/components/CodeBlock";

const SOURCE = `"use client";
import { useFileNest } from "@filenest/react";
import { useState } from "react";

// ── Tier 3 — Raw 3-step upload ─────────────────────────────────────────────

function HeadlessUploader() {
  const { initUpload, uploadToStorage, confirmUpload, upload } = useFileNest();
  const [log, setLog] = useState<string[]>([]);

  const append = (msg: string) => setLog((l) => [...l, msg]);

  // Option A — separate steps (full control)
  const uploadStepByStep = async (file: File) => {
    append(\`[1/3] Registering \${file.name}…\`);
    const { fileId, uploadUrl } = await initUpload({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });

    append("[2/3] Uploading to storage…");
    await uploadToStorage(uploadUrl, file, {
      onProgress: ({ percentage }) => append(\`  Progress: \${percentage}%\`),
    });

    append("[3/3] Confirming…");
    const { status } = await confirmUpload(fileId);
    append(\`Done — file_id=\${fileId} status=\${status}\`);
  };

  // Option B — combined (same steps, less code)
  const uploadCombined = async (file: File) => {
    const record = await upload(file, {
      metadata: { source: "headless-demo" },
      onProgress: ({ percentage }) => append(\`Progress: \${percentage}%\`),
    });
    append(\`Uploaded: \${record.id} — \${record.status}\`);
  };

  return (
    <div>
      <input type="file" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) uploadStepByStep(f);
      }} />
      <pre>{log.join("\\n")}</pre>
    </div>
  );
}

// ── Folder methods ──────────────────────────────────────────────────────────

function FolderDemo() {
  const { ensurePath, createFolder, listFolders, getFolderByPath, deleteFolder } = useFileNest();

  const run = async () => {
    // Ensure a nested path exists — creates missing intermediate folders
    const deepFolder = await ensurePath("projects/2025/reports");

    // Create a sibling
    const sibling = await createFolder({
      name: "assets",
      parentFolderId: deepFolder.parentFolderId ?? null,
    });

    // List top-level folders
    const { items } = await listFolders({ parentFolderId: null });

    // Resolve by path
    const found = await getFolderByPath("projects/2025/reports");

    // Clean up
    await deleteFolder(sibling.id);
  };

  return <button onClick={run}>Run folder demo</button>;
}`;

type LogEntry = { ts: string; msg: string; type: "info" | "progress" | "success" | "error" };

function useLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const append = (msg: string, type: LogEntry["type"] = "info") => {
    const ts = new Date().toLocaleTimeString();
    setEntries((prev) => [...prev, { ts, msg, type }]);
  };
  const clear = () => setEntries([]);
  return { entries, append, clear };
}

export default function HeadlessUploadPage() {
  const { initUpload, uploadToStorage, confirmUpload, upload, ensurePath, createFolder, listFolders, getFolderByPath, deleteFolder } =
    useFileNest();

  const uploadLog = useLog();
  const folderLog = useLog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<"steps" | "combined">("steps");

  const handleFile = async (file: File) => {
    setIsUploading(true);
    uploadLog.clear();
    try {
      if (mode === "steps") {
        uploadLog.append(`Registering "${file.name}" (${(file.size / 1024).toFixed(1)} KB)…`);
        const { fileId, uploadUrl } = await initUpload({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
        uploadLog.append(`file_id=${fileId}`, "info");

        uploadLog.append("Uploading to storage…");
        await uploadToStorage(uploadUrl, file, {
          onProgress: ({ percentage }) =>
            uploadLog.append(`  ${percentage}%`, "progress"),
        });

        uploadLog.append("Confirming upload…");
        const { status } = await confirmUpload(fileId);
        uploadLog.append(`Done — status: ${status}`, "success");
      } else {
        uploadLog.append(`Uploading "${file.name}"…`);
        const record = await upload(file, {
          metadata: { source: "headless-demo" },
          onProgress: ({ percentage }) =>
            uploadLog.append(`  ${percentage}%`, "progress"),
        });
        uploadLog.append(`Done — id: ${record.id}, status: ${record.status}`, "success");
      }
    } catch (err) {
      uploadLog.append(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setIsUploading(false);
    }
  };

  const runFolderDemo = async () => {
    folderLog.clear();
    try {
      folderLog.append("ensurePath('projects/2025/reports')…");
      const folder = await ensurePath("projects/2025/reports");
      folderLog.append(`  → id=${folder.id} name="${folder.name}"`, "success");

      folderLog.append("createFolder({ name: 'assets' })…");
      const sibling = await createFolder({ name: "assets", parentFolderId: folder.parentFolderId ?? null });
      folderLog.append(`  → id=${sibling.id}`, "success");

      folderLog.append("listFolders({ parentFolderId: null })…");
      const { items, total } = await listFolders({ parentFolderId: null });
      folderLog.append(`  → ${total} top-level folder(s): ${items.map((f) => f.name).join(", ")}`, "info");

      folderLog.append("getFolderByPath('projects/2025/reports')…");
      const found = await getFolderByPath("projects/2025/reports");
      folderLog.append(`  → ${found ? `found: ${found.name}` : "not found"}`, "info");

      folderLog.append(`deleteFolder(${sibling.id})…`);
      await deleteFolder(sibling.id);
      folderLog.append("  → deleted", "success");
    } catch (err) {
      folderLog.append(err instanceof Error ? err.message : String(err), "error");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useFileNest() headless API</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Tier 3 of the React SDK — direct access to every method in the context. Use when
          neither drop-in components nor managed hooks give you the control you need.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">

          {/* Upload tier explainer */}
          <div className="card">
            <div className="card-header"><div className="card-title">SDK tiers</div></div>
            <div className="card-body">
              <table className="table">
                <thead><tr><th>Tier</th><th>API</th><th>Control</th></tr></thead>
                <tbody>
                  <tr>
                    <td>1 — Components</td>
                    <td><code>&lt;FileUpload /&gt;</code></td>
                    <td>Minimal — just props</td>
                  </tr>
                  <tr>
                    <td>2 — Managed hooks</td>
                    <td><code>useUpload()</code></td>
                    <td>Progress, retry, cancel</td>
                  </tr>
                  <tr style={{ background: "var(--accent-light, #fdf4ff)" }}>
                    <td>3 — Headless</td>
                    <td><code>useFileNest()</code></td>
                    <td>Every step, full control</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload demo */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">3-step upload</div>
              <div className="card-desc">initUpload → uploadToStorage → confirmUpload</div>
            </div>
            <div className="card-body flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${mode === "steps" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setMode("steps")}
                >
                  Step-by-step
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${mode === "combined" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setMode("combined")}
                >
                  Combined (upload())
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                style={{ alignSelf: "flex-start" }}
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? "Uploading…" : "Choose file"}
              </button>

              {uploadLog.entries.length > 0 && (
                <pre
                  className="code-block"
                  style={{ fontSize: 12, minHeight: 80 }}
                >
                  {uploadLog.entries.map((e) => `[${e.ts}] ${e.msg}`).join("\n")}
                </pre>
              )}
            </div>
          </div>

          {/* Folder demo */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Folder methods</div>
              <div className="card-desc">
                ensurePath · createFolder · listFolders · getFolderByPath · deleteFolder
              </div>
            </div>
            <div className="card-body flex flex-col gap-3">
              <button
                type="button"
                className="btn btn-outline"
                style={{ alignSelf: "flex-start" }}
                onClick={runFolderDemo}
              >
                Run folder demo
              </button>

              {folderLog.entries.length > 0 && (
                <pre className="code-block" style={{ fontSize: 12, minHeight: 80 }}>
                  {folderLog.entries.map((e) => `[${e.ts}] ${e.msg}`).join("\n")}
                </pre>
              )}

              <div>
                <div className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>All headless methods</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {[
                    "upload(file, opts)", "initUpload(opts)", "uploadToStorage(url, file)",
                    "confirmUpload(fileId)", "listFiles(filters)", "getFile(fileId)",
                    "deleteFile(fileId)", "updateFile(id, opts)", "getDownloadUrl(id)",
                    "listFolders(opts)", "createFolder(opts)", "getFolder(folderId)",
                    "getFolderByPath(path)", "deleteFolder(folderId)", "ensurePath(path)",
                    "search(query)", "getToken()",
                  ].map((m) => (
                    <code key={m} className="text-sm" style={{ fontSize: 11 }}>{m}</code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <CodeBlock title="headless-upload/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
