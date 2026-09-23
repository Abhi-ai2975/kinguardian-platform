/**
 * Headless — useFileNest() raw imperative methods demo.
 *
 * Shows the 3-step upload (initUpload → uploadToStorage → confirmUpload),
 * file operations (getFile, deleteFile, updateFile, getDownloadUrl), and
 * folder methods (ensurePath, createFolder, listFolders, deleteFolder).
 */

import { useFileNest } from "@filenest/react";
import { useRef, useState } from "react";

type LogLine = { ts: string; msg: string };

function useLog() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const add = (msg: string) => setLines((l) => [...l, { ts: new Date().toLocaleTimeString(), msg }]);
  const clear = () => setLines([]);
  return { lines, add, clear };
}

export function HeadlessPage() {
  const fn = useFileNest();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"steps" | "combined">("steps");
  const [isBusy, setIsBusy] = useState(false);
  const uploadLog = useLog();
  const folderLog = useLog();

  const handleFile = async (file: File) => {
    uploadLog.clear();
    setIsBusy(true);
    try {
      if (mode === "steps") {
        // ── Step 1: Register the file with the backend ─────────────────────
        uploadLog.add(`[1/3] initUpload("${file.name}", ${file.size}B)`);
        const { fileId, uploadUrl } = await fn.initUpload({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
        uploadLog.add(`      → fileId=${fileId}`);

        // ── Step 2: PUT bytes directly to storage ──────────────────────────
        uploadLog.add("[2/3] uploadToStorage(presigned URL…)");
        await fn.uploadToStorage(uploadUrl, file, {
          onProgress: ({ percentage }) => uploadLog.add(`      → ${percentage}%`),
        });

        // ── Step 3: Tell the backend to start processing ───────────────────
        uploadLog.add("[3/3] confirmUpload(fileId)");
        const { status } = await fn.confirmUpload(fileId);
        uploadLog.add(`      → status=${status} ✓`);

        // ── Fetch the file record back ─────────────────────────────────────
        const record = await fn.getFile(fileId);
        uploadLog.add(`getFile → id=${record.id}, status=${record.status}`);
      } else {
        // Combined convenience method — same three steps internally
        uploadLog.add(`upload("${file.name}") — combined 3-step flow`);
        const record = await fn.upload(file, {
          metadata: { source: "react-sdk-example" },
          onProgress: ({ percentage }) => uploadLog.add(`  → ${percentage}%`),
        });
        uploadLog.add(`Done → id=${record.id}, status=${record.status} ✓`);
      }
    } catch (err) {
      uploadLog.add(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsBusy(false);
    }
  };

  const runFolderDemo = async () => {
    folderLog.clear();
    try {
      folderLog.add("ensurePath('projects/2025/reports')…");
      const folder = await fn.ensurePath("projects/2025/reports");
      folderLog.add(`  → id=${folder.id} name="${folder.name}"`);

      folderLog.add("createFolder({ name: 'assets' })…");
      const sibling = await fn.createFolder({ name: "assets", parentFolderId: folder.parentFolderId ?? null });
      folderLog.add(`  → id=${sibling.id}`);

      folderLog.add("listFolders({ parentFolderId: null })…");
      const { items, total } = await fn.listFolders({ parentFolderId: null });
      folderLog.add(`  → ${total} root folder(s): ${items.map((f) => f.name).join(", ")}`);

      folderLog.add("getFolderByPath('projects/2025/reports')…");
      const found = await fn.getFolderByPath("projects/2025/reports");
      folderLog.add(`  → ${found ? `found: "${found.name}"` : "not found (404)"}`);

      folderLog.add(`deleteFolder(${sibling.id})…`);
      await fn.deleteFolder(sibling.id);
      folderLog.add("  → deleted ✓");
    } catch (err) {
      folderLog.add(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useFileNest() — headless</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Tier 3: direct access to every method in the context. Use when components and
          managed hooks don't give you enough control.
        </p>
      </div>

      {/* SDK tier comparison */}
      <div className="card">
        <div className="card-header"><div className="card-title">SDK tiers at a glance</div></div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Tier</th><th>API</th><th>When to use</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><code>&lt;FileUpload /&gt;</code></td><td>Zero configuration, works immediately</td></tr>
              <tr><td>2</td><td><code>useUpload()</code> / <code>useFiles()</code></td><td>Custom UI, managed state</td></tr>
              <tr><td style={{ fontWeight: 600 }}>3</td><td><code>useFileNest()</code></td><td>Full control over every step</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3-step upload */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">3-step upload</div>
          <div className="card-desc">initUpload → uploadToStorage → confirmUpload</div>
        </div>
        <div className="card-body flex flex-col gap-3">
          <div className="flex gap-2">
            <button type="button" className={`btn btn-sm ${mode === "steps" ? "btn-primary" : "btn-outline"}`} onClick={() => setMode("steps")}>Step-by-step</button>
            <button type="button" className={`btn btn-sm ${mode === "combined" ? "btn-primary" : "btn-outline"}`} onClick={() => setMode("combined")}>Combined upload()</button>
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
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {isBusy ? "Uploading…" : "Choose file"}
          </button>

          {uploadLog.lines.length > 0 && (
            <pre className="code-block" style={{ fontSize: 12 }}>
              {uploadLog.lines.map((l) => `[${l.ts}] ${l.msg}`).join("\n")}
            </pre>
          )}
        </div>
      </div>

      {/* Folder methods */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Folder methods</div>
          <div className="card-desc">ensurePath · createFolder · listFolders · getFolderByPath · deleteFolder</div>
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
          {folderLog.lines.length > 0 && (
            <pre className="code-block" style={{ fontSize: 12 }}>
              {folderLog.lines.map((l) => `[${l.ts}] ${l.msg}`).join("\n")}
            </pre>
          )}
        </div>
      </div>

      {/* Full API reference */}
      <div className="card">
        <div className="card-header"><div className="card-title">All useFileNest() methods</div></div>
        <div className="card-body">
          <pre className="code-block">{`const fn = useFileNest();

// ── Token ──────────────────────────────────────────────────────
fn.getToken()                           // → Promise<string>
fn.token                                // string | null (reactive)
fn.isTokenLoading                       // boolean (reactive)
fn.isReady                              // boolean — initial fetch done

// ── Upload — 3 steps ───────────────────────────────────────────
fn.initUpload({ filename, contentType, sizeBytes, folderId?, metadata?, tags? })
fn.uploadToStorage(url, file, { onProgress? })
fn.confirmUpload(fileId)

// ── Upload — combined ──────────────────────────────────────────
fn.upload(file, { folderId?, metadata?, tags?, onProgress? })

// ── Files ──────────────────────────────────────────────────────
fn.listFiles({ folderId?, mimeType?, status?, tags?, limit?, offset?, sortBy?, sortOrder? })
fn.getFile(fileId)
fn.deleteFile(fileId)
fn.updateFile(fileId, { filename?, tags?, metadata? })
fn.getDownloadUrl(fileId, { ttl?, disposition? })

// ── Folders ────────────────────────────────────────────────────
fn.listFolders({ parentFolderId?, name?, limit?, offset? })
fn.createFolder({ name, parentFolderId? })
fn.getFolder(folderId)
fn.getFolderByPath(path)               // returns null on 404
fn.deleteFolder(folderId)
fn.ensurePath(path)                    // creates missing intermediates

// ── Search ─────────────────────────────────────────────────────
fn.search({ q?, filters?, tags?, limit?, offset? })`}</pre>
        </div>
      </div>
    </div>
  );
}
