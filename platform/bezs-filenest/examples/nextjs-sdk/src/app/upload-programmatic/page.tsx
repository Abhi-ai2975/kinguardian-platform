"use client";

/**
 * /upload-programmatic — useUpload() hook for programmatic upload control.
 *
 * Full control over the upload lifecycle: trigger manually, track per-file
 * progress state, retry failures, clear the list.
 */

import { useUpload } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import { useRef } from "react";

const SOURCE = `"use client";
import { useUpload } from "@filenest/react";

export function ProgrammaticUpload() {
  const { upload, uploads, isUploading, cancel, retry, clear } = useUpload({
    metadata: { uploadedBy: "demo-user" },
    onComplete: (file) => console.log("Done:", file.id),
    onError: (err, filename) => console.error(filename, err.message),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) upload(files);
  };

  return (
    <div>
      <input type="file" multiple onChange={handleChange} />
      {uploads.map(u => (
        <div key={u.id}>
          <span>{u.filename}</span>
          <span>{u.status === "uploading" ? \`\${u.progress}%\` : u.status}</span>
          {u.status === "failed" && (
            <button onClick={() => retry(u.id)}>Retry</button>
          )}
        </div>
      ))}
      {uploads.length > 0 && !isUploading && (
        <button onClick={clear}>Clear</button>
      )}
    </div>
  );
}`;

export default function UploadProgrammaticPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const { upload, uploads, isUploading, cancel, retry, clear } = useUpload({
    metadata: { source: "nextjs-sdk-example" },
    onComplete: (file) => console.log("[useUpload] complete:", file.id),
    onError: (err, filename) => console.error("[useUpload] error:", filename, err.message),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      upload(files);
      // Reset input so the same file can be selected again
      e.target.value = "";
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useUpload hook</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Full programmatic control — trigger upload via any UI element, track per-file
          state (<code>pending → uploading → success / failed</code>), retry failures,
          and cancel in-progress uploads.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Programmatic upload</div>
              <div className="card-desc">useUpload() gives you full control over the upload lifecycle</div>
            </div>
            <div className="card-body flex flex-col gap-3">
              <input
                ref={inputRef}
                type="file"
                multiple
                onChange={handleChange}
                style={{ display: "none" }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => inputRef.current?.click()}
                  disabled={isUploading}
                >
                  Select files to upload
                </button>
                {uploads.length > 0 && !isUploading && (
                  <button type="button" className="btn btn-outline" onClick={clear}>
                    Clear list
                  </button>
                )}
              </div>

              {uploads.length === 0 && (
                <p className="text-sm text-muted">No uploads yet. Select files above.</p>
              )}

              {uploads.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: "12px 14px",
                    background: "var(--bg)",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ fontWeight: 500 }}>{u.filename}</span>
                    <div className="flex items-center gap-2">
                      {u.status === "uploading" && (
                        <>
                          <span className="text-sm text-muted">{u.progress}%</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => cancel(u.id)}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {u.status === "success" && <span className="badge badge-green">done</span>}
                      {u.status === "failed" && (
                        <>
                          <span className="badge badge-red">failed</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => retry(u.id)}
                          >
                            Retry
                          </button>
                        </>
                      )}
                      {u.status === "pending" && <span className="badge badge-gray">pending</span>}
                    </div>
                  </div>
                  {u.status === "uploading" && (
                    <div
                      style={{
                        height: 4,
                        background: "var(--border)",
                        borderRadius: 2,
                        overflow: "hidden",
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${u.progress}%`,
                          background: "var(--accent)",
                          transition: "width 0.1s",
                        }}
                      />
                    </div>
                  )}
                  {u.status === "failed" && u.error && (
                    <p className="text-sm mt-2" style={{ color: "var(--error)" }}>
                      {u.error.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Hook state</div>
              <div className="card-desc">Live view of useUpload() return values</div>
            </div>
            <div className="card-body">
              <pre className="code-block" style={{ fontSize: 12 }}>
                {JSON.stringify(
                  {
                    isUploading,
                    uploadCount: uploads.length,
                    statuses: uploads.reduce<Record<string, number>>((acc, u) => {
                      acc[u.status] = (acc[u.status] ?? 0) + 1;
                      return acc;
                    }, {}),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>

        <CodeBlock title="upload-programmatic/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
