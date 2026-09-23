"use client";

/**
 * /upload-dropzone — FileUpload component with variant="dropzone".
 *
 * Drag-and-drop or click-to-browse. Shows per-file progress bars.
 * Token is fetched automatically from /api/filenest-token by FileNestProvider.
 */

import { FileUpload } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import type { FileRecord } from "@filenest/core";
import { useState } from "react";

const SOURCE = `"use client";
import { FileUpload } from "@filenest/react";

export function DropzoneDemo() {
  return (
    <FileUpload
      variant="dropzone"
      accept={["image/*", "application/pdf", "video/*"]}
      maxSize={100 * 1024 * 1024}  // 100 MB
      maxFiles={5}
      multiple={true}
      placeholder="Drag and drop files here, or click to browse"
      showProgress={true}
      onComplete={(files) => console.log("Uploaded:", files)}
      onError={(err, filename) =>
        console.error(\`\${filename}: \${err.message}\`)
      }
      onValidationError={(errors) =>
        errors.forEach(e => alert(e.message))
      }
    />
  );
}

// FileNestProvider (in layout.tsx) handles the token exchange.
// No API key in client code.`;

export default function UploadDropzonePage() {
  const [uploaded, setUploaded] = useState<FileRecord[]>([]);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>FileUpload — dropzone</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Drag-and-drop zone with per-file progress bars. Accepts images, PDFs, and videos.
          The upload token is fetched automatically — no API key in browser code.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Drag and drop demo</div>
              <div className="card-desc">Max 100 MB per file · up to 5 files</div>
            </div>
            <div className="card-body">
              <FileUpload
                variant="dropzone"
                accept={["image/*", "application/pdf", "video/*", "audio/*"]}
                maxSize={100 * 1024 * 1024}
                maxFiles={5}
                multiple
                placeholder="Drag and drop files here, or click to browse"
                showProgress
                onComplete={(files) => setUploaded((prev) => [...prev, ...files])}
                onValidationError={(errors) =>
                  errors.forEach((e) => alert(e.message))
                }
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
                    <th>Status</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {uploaded.map((f) => (
                    <tr key={f.id}>
                      <td>{f.filename}</td>
                      <td><span className="badge badge-blue">{f.status}</span></td>
                      <td className="text-sm font-mono text-muted">{f.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <CodeBlock title="upload-dropzone/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
