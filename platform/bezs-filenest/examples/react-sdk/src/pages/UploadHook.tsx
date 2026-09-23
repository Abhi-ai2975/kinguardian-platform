/**
 * UploadHook — useUpload() managed hook demo with per-file progress, retry, cancel.
 */

import { useUpload } from "@filenest/react";
import { useRef } from "react";

const STATUS_COLORS: Record<string, string> = {
  pending: "badge-gray",
  uploading: "badge-blue",
  success: "badge-green",
  failed: "badge-red",
};

export function UploadHookPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, uploads, isUploading, cancel, retry, clear } = useUpload({
    metadata: { source: "react-sdk-example" },
    tags: ["demo"],
    onComplete: (file) => console.log("Uploaded:", file.id),
    onError: (err, upload) => console.error(`${upload.filename} failed:`, err.message),
  });

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useUpload hook</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Tier 2 managed hook for programmatic uploads with per-file progress, retry, and cancel.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div>
              <div className="card-title">Upload files</div>
              <div className="card-desc">
                {isUploading
                  ? `Uploading ${uploads.filter((u) => u.status === "uploading").length} file(s)…`
                  : `${uploads.length} file(s) queued`}
              </div>
            </div>
            <div className="flex gap-2" style={{ marginLeft: "auto" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Choose files
              </button>
              {uploads.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={clear}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) upload(files);
            e.target.value = "";
          }}
        />

        {uploads.length === 0 ? (
          <div className="card-body text-muted text-sm">
            No uploads yet — click "Choose files" above.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id}>
                  <td style={{ maxWidth: 240 }} className="truncate">{u.filename}</td>
                  <td style={{ minWidth: 100 }}>
                    {u.status === "uploading" ? (
                      <div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${u.progress}%` }} />
                        </div>
                        <span className="text-sm text-muted" style={{ fontSize: 11 }}>{u.progress}%</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[u.status] ?? "badge-gray"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {u.status === "uploading" && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => cancel(u.id)}
                        >
                          Cancel
                        </button>
                      )}
                      {u.status === "failed" && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => retry(u.id)}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">useUpload return value</div></div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>upload(files)</code></td><td>(File | File[]) =&gt; void</td><td>Queue and start uploading</td></tr>
              <tr><td><code>uploads</code></td><td>UploadState[]</td><td>Per-file state array</td></tr>
              <tr><td><code>isUploading</code></td><td>boolean</td><td>True while any file is in progress</td></tr>
              <tr><td><code>cancel(id)</code></td><td>(string) =&gt; void</td><td>Cancel an in-progress upload</td></tr>
              <tr><td><code>retry(id)</code></td><td>(string) =&gt; void</td><td>Retry a failed upload</td></tr>
              <tr><td><code>clear()</code></td><td>() =&gt; void</td><td>Remove all completed/cancelled entries</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Code</div></div>
        <div className="card-body">
          <pre className="code-block">{`import { useUpload } from "@filenest/react";

const { upload, uploads, isUploading, cancel, retry } = useUpload({
  folderId: "folder_abc",                // optional — target folder
  metadata: { source: "my-app" },        // attached to every uploaded file
  tags: ["demo"],
  onComplete: (file) => console.log("done:", file.id),
  onError: (err, upload) => alert(err.message),
});

// Trigger from a file input
<input type="file" multiple
  onChange={(e) => upload(Array.from(e.target.files ?? []))} />

// Render per-file state
{uploads.map((u) => (
  <div key={u.id}>
    {u.filename}: {u.status} — {u.progress}%
    {u.status === "failed" && <button onClick={() => retry(u.id)}>Retry</button>}
  </div>
))}`}</pre>
        </div>
      </div>
    </div>
  );
}
