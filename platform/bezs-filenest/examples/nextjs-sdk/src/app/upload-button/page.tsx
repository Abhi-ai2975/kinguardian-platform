"use client";

/**
 * /upload-button — FileUpload component with variant="button".
 *
 * Click-to-upload with a simple button. Same underlying token + upload logic,
 * just a different visual presentation.
 */

import { FileUpload } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import type { FileRecord } from "@filenest/react";
import { useState } from "react";

const SOURCE = `"use client";
import { FileUpload } from "@filenest/react";

export function ButtonUploadDemo() {
  return (
    <FileUpload
      variant="button"
      accept={["image/*", "application/pdf"]}
      maxSize={50 * 1024 * 1024}
      multiple={true}
      showProgress={true}
      onComplete={(files) => console.log("Done:", files)}
    />
  );
}`;

export default function UploadButtonPage() {
  const [uploaded, setUploaded] = useState<FileRecord[]>([]);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>FileUpload — button</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Button variant — click to open the system file picker. Same upload logic as
          the dropzone, just a more compact UI. Useful for inline forms.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Button upload</div>
              <div className="card-desc">Click the button to select files</div>
            </div>
            <div className="card-body flex flex-col gap-3">
              <p className="text-sm text-muted">
                Use <code>variant=&quot;button&quot;</code> when embedding upload in a form or toolbar
                where a full dropzone zone would take too much space.
              </p>
              <FileUpload
                variant="button"
                accept={["image/*", "application/pdf", "text/*"]}
                maxSize={50 * 1024 * 1024}
                multiple
                showProgress
                onComplete={(files) => setUploaded((prev) => [...prev, ...files])}
              />
            </div>
          </div>

          {uploaded.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Uploaded this session</div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {uploaded.map((f) => (
                    <tr key={f.id}>
                      <td>{f.filename}</td>
                      <td className="text-muted">{(f.size / 1024).toFixed(1)} KB</td>
                      <td><span className="badge badge-blue">{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <CodeBlock title="upload-button/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
