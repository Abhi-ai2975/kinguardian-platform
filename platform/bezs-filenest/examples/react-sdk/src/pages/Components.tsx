/**
 * Components — Tier 1 drop-in component demos: FileUpload (dropzone + button),
 * FilePreview, FileViewer.
 */

import { useState } from "react";
import { FileUpload, FilePreview, FileViewer } from "@filenest/react";
import type { FileRecord } from "@filenest/react";

export function ComponentsPage() {
  const [uploadedFile, setUploadedFile] = useState<FileRecord | null>(null);
  const [viewerFileId, setViewerFileId] = useState<string | null>(null);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>Tier 1 — Drop-in components</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Fully managed components — just render them inside a <code>FileNestProvider</code>.
          No state management needed.
        </p>
      </div>

      {/* FileUpload — dropzone variant */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">FileUpload — dropzone variant</div>
          <div className="card-desc">Drag files here or click to browse</div>
        </div>
        <div className="card-body">
          <FileUpload
            variant="dropzone"
            accept={["image/jpeg", "image/png", "image/gif", "application/pdf"]}
            maxSize={10 * 1024 * 1024}
            maxFiles={5}
            multiple={true}
            placeholder="Drop images or PDFs here, or click to browse"
            showProgress={true}
            showPreview={true}
            metadata={{ uploadedFrom: "react-sdk-example" }}
            tags={["demo"]}
            onComplete={(files) => {
              if (files.length > 0) setUploadedFile(files[files.length - 1]);
            }}
            onError={(error, file) =>
              console.error(`Upload failed for ${file.filename}:`, error.message)
            }
          />
        </div>
      </div>

      {/* FileUpload — button variant */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">FileUpload — button variant</div>
          <div className="card-desc">Minimal click-to-upload UI</div>
        </div>
        <div className="card-body">
          <FileUpload
            variant="button"
            accept={["image/*"]}
            maxSize={5 * 1024 * 1024}
            multiple={false}
            placeholder="Choose image"
            showProgress={true}
            onComplete={(files) => {
              if (files[0]) setUploadedFile(files[0]);
            }}
          />
        </div>
      </div>

      {/* FileUpload — with metadata form */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">FileUpload — with metadata form</div>
          <div className="card-desc">
            Users fill in structured metadata before the file is uploaded
          </div>
        </div>
        <div className="card-body">
          <FileUpload
            variant="dropzone"
            accept={["application/pdf"]}
            maxFiles={1}
            placeholder="Drop a PDF to annotate"
            metadataForm={{
              fields: [
                {
                  name: "documentType",
                  label: "Document type",
                  type: "select",
                  options: ["Invoice", "Contract", "Report", "Other"],
                  required: true,
                },
                {
                  name: "notes",
                  label: "Notes",
                  type: "textarea",
                },
              ],
            }}
            onComplete={(files) => {
              if (files[0]) setUploadedFile(files[0]);
            }}
          />
        </div>
      </div>

      {/* FilePreview */}
      {uploadedFile && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div>
                <div className="card-title">FilePreview</div>
                <div className="card-desc">Inline preview of the last uploaded file</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ marginLeft: "auto" }}
                onClick={() => setViewerFileId(uploadedFile.id)}
              >
                Open in viewer
              </button>
            </div>
          </div>
          <div className="card-body">
            <FilePreview
              fileId={uploadedFile.id}
              showMetadata={true}
              showVersionHistory={false}
              allowDownload={true}
              height="300px"
              onClose={() => setUploadedFile(null)}
            />
          </div>
        </div>
      )}

      {/* FileViewer */}
      {viewerFileId && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">FileViewer</div>
            <div className="card-desc">Full-page viewer with toolbar</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <FileViewer
              fileId={viewerFileId}
              showToolbar={true}
              showSidebar={false}
              layout="contained"
              onClose={() => setViewerFileId(null)}
            />
          </div>
        </div>
      )}

      {/* Props reference */}
      <div className="card">
        <div className="card-header"><div className="card-title">FileUpload key props</div></div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>variant</code></td><td>"dropzone" | "button"</td><td>UI style</td></tr>
              <tr><td><code>accept</code></td><td>string[]</td><td>Allowed MIME types</td></tr>
              <tr><td><code>maxSize</code></td><td>number</td><td>Max file size in bytes</td></tr>
              <tr><td><code>maxFiles</code></td><td>number</td><td>Max number of files per selection</td></tr>
              <tr><td><code>multiple</code></td><td>boolean</td><td>Allow multi-select</td></tr>
              <tr><td><code>folderId</code></td><td>string</td><td>Target folder ID</td></tr>
              <tr><td><code>metadata</code></td><td>Record&lt;string, unknown&gt;</td><td>Static metadata attached to every upload</td></tr>
              <tr><td><code>metadataForm</code></td><td>object</td><td>Dynamic per-upload metadata form</td></tr>
              <tr><td><code>onComplete</code></td><td>(files: FileRecord[]) =&gt; void</td><td>Called when all files finish</td></tr>
              <tr><td><code>onError</code></td><td>(err, file) =&gt; void</td><td>Called per-file on failure</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
