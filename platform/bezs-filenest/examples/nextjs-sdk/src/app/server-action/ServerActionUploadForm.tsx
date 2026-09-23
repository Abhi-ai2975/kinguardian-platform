"use client";

import { useRef, useState, useTransition } from "react";
import type { FileRecord } from "@filenest/core";
import { uploadFileAction } from "./actions";

export function ServerActionUploadForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ file?: FileRecord; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await uploadFileAction(formData);
      setResult(res);
      if (res.file) formRef.current?.reset();
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Upload via server action</div>
        <div className="card-desc">FormData sent to the server — no client-side token needed</div>
      </div>
      <div className="card-body">
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
          <div className="field">
            <label className="label" htmlFor="file">Choose a file</label>
            <input id="file" name="file" type="file" className="input" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? "Uploading…" : "Upload with server action"}
          </button>
        </form>

        {result?.error && (
          <div
            className="mt-4 text-sm"
            style={{ padding: "10px 14px", background: "var(--error-light)", borderRadius: 6, color: "#dc2626" }}
          >
            {result.error}
          </div>
        )}

        {result?.file && (
          <div
            className="mt-4"
            style={{ padding: "12px 16px", background: "var(--success-light)", borderRadius: 6 }}
          >
            <div className="text-sm" style={{ fontWeight: 600, color: "#16a34a" }}>Upload successful</div>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", marginTop: 8 }}>
              {[
                ["ID", result.file.id],
                ["Filename", result.file.filename],
                ["Size", `${(result.file.sizeBytes / 1024).toFixed(1)} KB`],
                ["Status", result.file.status],
                ["MIME", result.file.contentType],
              ].map(([k, v]) => (
                <>
                  <dt key={`k-${k}`} className="text-sm text-muted">{k}</dt>
                  <dd key={`v-${k}`} className="text-sm font-mono" style={{ margin: 0 }}>{v}</dd>
                </>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
