# FileNest v1.0 — SDK Specification

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [SDK Architecture Overview](#1-sdk-architecture-overview)
2. [Node.js SDK](#2-nodejs-sdk)
3. [React SDK](#3-react-sdk)
4. [Next.js SDK](#4-nextjs-sdk)
5. [Python SDK](#5-python-sdk)
6. [SDK Error Handling](#6-sdk-error-handling)
7. [Versioning and Compatibility](#7-versioning-and-compatibility)

---

## 1. SDK Architecture Overview

### 1.1 SDK Design Principles

1. **Type-safe by default** — TypeScript-first for all JS SDKs
2. **Minimal dependencies** — no heavy dependency chains
3. **Tree-shakeable** — unused features add zero bundle size
4. **Framework-agnostic core** — `@filenest/core` contains shared logic
5. **Progressive disclosure** — simple tasks are simple; complex tasks are possible
6. **Consistent error types** — same error classes across all SDKs

### 1.2 Package Hierarchy

```
@filenest/core           # Shared HTTP client, types, error classes
@filenest/node           # Node.js SDK (extends core)
@filenest/react          # React components and hooks
@filenest/nextjs         # Next.js route handlers and server actions
filenest                 # Python SDK (PyPI)
```

### 1.3 Authentication Flow

```
Backend (Node/Python SDK)
  Uses API Key directly
  API_KEY → Authorization: Bearer fn_live_abc...

Frontend (React/Next.js SDK)
  Never uses API Key directly (would be exposed in browser)
  Backend issues short-lived upload tokens
  Token → Authorization: Bearer fn_upload_token_...
```

---

## 2. Node.js SDK

### 2.1 Installation

```bash
npm install @filenest/node
# or
pnpm add @filenest/node
# or
yarn add @filenest/node
```

### 2.2 Initialization

```typescript
import { FileNest } from '@filenest/node';

const filenest = new FileNest({
  apiKey: process.env.FILENEST_API_KEY!,
  projectId: process.env.FILENEST_PROJECT_ID!,   // Optional: set per-call instead
  environment: 'production',                       // Optional: default 'production'
  baseUrl: 'https://api.filenest.io',              // Optional: for self-hosted
  timeout: 30000,                                  // ms, default 30s
  maxRetries: 3,                                   // Auto-retry on 5xx
});
```

### 2.3 File Upload

#### Simple Upload (Buffer or Stream)

```typescript
import { createReadStream } from 'fs';

// From Buffer
const file = await filenest.files.upload({
  filename: 'discharge-summary.pdf',
  data: Buffer.from(pdfBytes),
  mimeType: 'application/pdf',
  metadata: {
    patientId: 'P-12345',
    documentType: 'Discharge',
    encounterId: 'E-67890',
  },
  tags: ['clinical', 'discharge'],
  folderId: 'folder_abc',
});

console.log(file.id);      // file_xyz789
console.log(file.status);  // 'processing'

// From Readable stream
const file = await filenest.files.upload({
  filename: 'large-scan.pdf',
  data: createReadStream('/tmp/scan.pdf'),
  size: 52428800,           // Required when using stream
  mimeType: 'application/pdf',
  metadata: { patientId: 'P-12345', documentType: 'Imaging' },
});
```

#### Upload with Progress

```typescript
const file = await filenest.files.upload({
  filename: 'large-file.zip',
  data: createReadStream('/tmp/large-file.zip'),
  size: 524288000,
  onProgress: (progress) => {
    console.log(`${progress.percentage}% uploaded (${progress.bytesUploaded}/${progress.totalBytes})`);
    // { bytesUploaded: 52428800, totalBytes: 524288000, percentage: 10, chunkNumber: 10, totalChunks: 100 }
  },
});
```

#### Resumable Upload

```typescript
// Start upload
const session = await filenest.uploads.create({
  filename: 'huge-dicom.dcm',
  size: 5368709120,  // 5GB
  mimeType: 'application/dicom',
  metadata: { patientId: 'P-12345', modality: 'MRI' },
});

// Save session ID for resume
const sessionId = session.sessionId;  // Store this

// If interrupted, resume:
const resumedFile = await filenest.uploads.resume(sessionId, {
  data: createReadStream('/tmp/huge-dicom.dcm'),
  onProgress: (p) => console.log(`${p.percentage}%`),
});
```

### 2.4 File Download

```typescript
// Get signed download URL (recommended)
const { url, expiresAt } = await filenest.files.getDownloadUrl('file_xyz789', {
  ttl: 3600,              // seconds
  disposition: 'attachment',
});

// Proxy download (stream through your server)
const stream = await filenest.files.download('file_xyz789');
stream.pipe(res);  // Express response

// Download to buffer
const buffer = await filenest.files.downloadToBuffer('file_xyz789');
```

### 2.5 File Operations

```typescript
// List files
const { data, pagination } = await filenest.files.list({
  limit: 20,
  folderId: 'folder_abc',
  metadata: { patientId: 'P-12345' },
  tags: ['clinical'],
  sortBy: 'created_at',
  sortOrder: 'desc',
});

// Get single file
const file = await filenest.files.get('file_xyz789');

// Update file metadata
const updated = await filenest.files.update('file_xyz789', {
  tags: ['clinical', 'reviewed'],
  metadata: {
    patientId: 'P-12345',
    documentType: 'Discharge',
    reviewedBy: 'Dr. Smith',
  },
});

// Delete file (soft delete)
await filenest.files.delete('file_xyz789');

// Restore deleted file
await filenest.files.restore('file_xyz789');
```

### 2.6 Search

```typescript
// Simple search
const results = await filenest.search.query('discharge summary');

// Advanced search
const results = await filenest.search.query({
  q: 'lab report abnormal',
  filters: {
    metadata: { patientId: 'P-12345', documentType: 'LabReport' },
    tags: ['urgent'],
    createdAfter: new Date('2026-01-01'),
    mimeType: ['application/pdf'],
  },
  facets: ['documentType', 'tags'],
  limit: 20,
});

// Iterate all results
for await (const file of filenest.search.iterate({ q: 'discharge' })) {
  console.log(file.id, file.filename);
}
```

### 2.7 Folder Management

```typescript
// Create folder
const folder = await filenest.folders.create({
  name: 'Lab Reports 2026',
  parentFolderId: 'folder_root',
  metadata: { year: '2026', department: 'pathology' },
});

// List folders
const { data } = await filenest.folders.list({ parentFolderId: null });

// Get folder with stats
const folder = await filenest.folders.get('folder_abc', { includeStats: true });
// { id, name, path, fileCount: 142, totalSizeBytes: 524288000 }

// Delete folder
await filenest.folders.delete('folder_abc', { force: false });
```

### 2.8 Version Management

```typescript
// Get file versions
const { data: versions } = await filenest.files.versions.list('file_xyz789');

// Create new version
const newVersion = await filenest.files.versions.create('file_xyz789', {
  data: updatedBuffer,
  size: updatedSize,
  changeNote: 'Corrected patient name',
});

// Rollback to version
const file = await filenest.files.versions.rollback('file_xyz789', 1, {
  changeNote: 'Rolling back to original version',
});
```

### 2.9 Webhooks

```typescript
// Create webhook
const webhook = await filenest.webhooks.create({
  name: 'Processing notifications',
  url: 'https://api.acme.com/webhooks/filenest',
  events: ['file.uploaded', 'file.processed', 'file.virus_detected'],
});

// Verify incoming webhook payload (Express example)
app.post('/webhooks/filenest', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-filenest-signature'] as string;
  const isValid = filenest.webhooks.verify(req.body, signature, process.env.WEBHOOK_SECRET!);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());
  console.log(event.type, event.data.fileId);
  res.status(200).send('OK');
});
```

### 2.10 Upload Token Generation (for Frontend)

```typescript
// Generate short-lived token for frontend upload
const token = await filenest.uploadTokens.create({
  maxSize: 50 * 1024 * 1024,     // 50MB
  allowedMimeTypes: ['application/pdf', 'image/*'],
  maxFiles: 5,
  folderId: 'folder_abc',
  metadata: {
    uploadedBy: user.id,
    sessionId: sessionId,
  },
  expiresIn: 3600,  // 1 hour
});

// Return token to frontend
return { token: token.token, expiresAt: token.expiresAt };
```

### 2.11 Compliance Operations

```typescript
// Set legal hold
await filenest.compliance.setLegalHold('file_xyz789', {
  reason: 'Regulatory audit 2026-Q2',
  indefinite: true,
});

// Release legal hold
await filenest.compliance.releaseLegalHold('file_xyz789', {
  releaseReason: 'Audit completed',
});

// Commit to WORM
await filenest.compliance.commitWorm('file_xyz789', {
  confirm: true,
  reason: 'SEC filing requirement',
});

// Get PHI detection results
const phiResult = await filenest.healthcare.getPhiDetection('file_xyz789');
```

### 2.12 Audit

```typescript
// List audit events
const { data } = await filenest.audit.list({
  eventTypes: ['file.downloaded', 'file.deleted'],
  dateFrom: new Date('2026-01-01'),
  dateTo: new Date('2026-06-30'),
  limit: 100,
});

// Export audit logs
const exportJob = await filenest.audit.export({
  dateFrom: new Date('2026-01-01'),
  dateTo: new Date('2026-03-31'),
  format: 'csv',
});

// Poll for completion
const result = await filenest.audit.getExport(exportJob.exportId);
```

### 2.13 Full TypeScript Types

```typescript
// Types are fully exported
import type {
  File,
  FileStatus,
  FileVersion,
  Folder,
  UploadSession,
  SearchResults,
  SearchFilters,
  Webhook,
  AuditLog,
  ProcessingJob,
  ProcessingStage,
  ComplianceStatus,
  PHIDetectionResult,
  FHIRDocumentReference,
  UploadToken,
  APIKey,
  ServiceAccount,
  Project,
  ProjectConfig,
  Organization,
} from '@filenest/node';
```

---

## 3. React SDK

### 3.1 Installation

```bash
npm install @filenest/react
```

### 3.2 Provider Setup

```tsx
// app/layout.tsx or _app.tsx
import { FileNestProvider } from '@filenest/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <FileNestProvider
          tokenEndpoint="/api/filenest-token"
          projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
          options={{
            environment: 'production',
            debug: process.env.NODE_ENV === 'development',
          }}
        >
          {children}
        </FileNestProvider>
      </body>
    </html>
  );
}
```

### 3.3 FileUpload Component

```tsx
import { FileUpload } from '@filenest/react';

export function DocumentUploader() {
  return (
    <FileUpload
      // Constraints
      accept={['application/pdf', 'image/jpeg', 'image/png']}
      maxSize={50 * 1024 * 1024}   // 50MB
      maxFiles={10}
      multiple={true}

      // Metadata
      folderId="folder_abc"
      metadata={{
        documentType: 'LabReport',
        uploadedBy: currentUser.id,
      }}
      metadataForm={{
        fields: [
          {
            name: 'documentType',
            label: 'Document Type',
            type: 'select',
            options: ['LabReport', 'Discharge', 'Consent'],
            required: true,
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
          },
        ],
      }}

      // UI options
      variant="dropzone"            // 'dropzone' | 'button' | 'minimal'
      placeholder="Drag and drop clinical documents here"
      showProgress={true}
      showPreview={true}

      // Callbacks
      onUploadStart={(files) => console.log('Starting upload', files)}
      onProgress={(file, progress) => {
        console.log(`${file.filename}: ${progress.percentage}%`);
      }}
      onComplete={(files) => {
        console.log('All uploaded:', files);
        // files: FileNestFile[]
      }}
      onError={(error, file) => {
        console.error('Upload failed:', error.message);
        toast.error(`Failed to upload ${file.filename}: ${error.message}`);
      }}

      // Validation
      onValidationError={(errors) => {
        errors.forEach(err => toast.warning(err.message));
      }}
    />
  );
}
```

### 3.4 FileExplorer Component

```tsx
import { FileExplorer } from '@filenest/react';

export function DocumentBrowser() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  return (
    <FileExplorer
      // Root folder (null = project root)
      rootFolderId={null}

      // Display options
      defaultView="grid"          // 'grid' | 'list'
      showFolders={true}
      showSearch={true}
      showFilters={true}
      showUploadButton={true}

      // Columns to show in list view
      columns={['filename', 'size', 'mimeType', 'metadata.documentType', 'createdAt']}

      // Search configuration
      searchFacets={['documentType', 'tags']}

      // Selection
      selectable={true}
      multiSelect={true}
      selectedIds={selectedFiles}
      onSelectionChange={setSelectedFiles}

      // Actions
      actions={['download', 'delete', 'move', 'rename']}
      onFileClick={(file) => setPreviewFile(file)}
      onFileDownload={(file) => {
        // Custom download handler — default is to open signed URL
        window.open(file.downloadUrl, '_blank');
      }}
      onFileDelete={async (file) => {
        await confirm(`Delete ${file.filename}?`);
      }}

      // Metadata display
      metadataColumns={[
        { field: 'metadata.patientId', header: 'Patient ID' },
        { field: 'metadata.documentType', header: 'Type' },
      ]}

      // Empty state
      emptyState={<div>No documents found. Upload your first document above.</div>}
    />
  );
}
```

### 3.5 FilePreview Component

```tsx
import { FilePreview } from '@filenest/react';

export function DocumentPreviewPanel({ fileId }: { fileId: string }) {
  return (
    <FilePreview
      fileId={fileId}

      // Supported preview types (auto-detected from MIME type)
      // PDF, images, text files, common Office formats

      // Options
      showMetadata={true}
      showVersionHistory={true}
      showProcessingResults={true}
      showAuditHistory={false}

      // Download option
      allowDownload={true}
      downloadTtl={3600}

      // Size
      height="600px"
      width="100%"

      // Callbacks
      onClose={() => setPreviewFile(null)}
      onDownload={(url) => window.open(url)}
      onVersionSelect={(version) => console.log('Selected version', version)}
    />
  );
}
```

### 3.6 FileViewer Component

```tsx
import { FileViewer } from '@filenest/react';

// Full-page document viewer
export function DocumentViewerPage({ fileId }: { fileId: string }) {
  return (
    <FileViewer
      fileId={fileId}

      // Viewer features
      showToolbar={true}
      showSidebar={true}         // Metadata + versions sidebar
      showAnnotations={false}    // v2 feature

      // PDF-specific
      pdf={{
        showPageNumbers: true,
        enableSearch: true,       // Ctrl+F search in PDF
        enableZoom: true,
        defaultZoom: 'fit-width',
      }}

      // Image-specific
      image={{
        enableZoom: true,
        enableRotate: true,
      }}

      // Layout
      layout="fullscreen"        // 'fullscreen' | 'contained'

      onClose={() => router.back()}
    />
  );
}
```

### 3.7 Hooks

#### useUpload

```tsx
import { useUpload } from '@filenest/react';

function UploadButton() {
  const {
    upload,
    uploads,        // Active upload states
    isUploading,
    cancel,
    retry,
  } = useUpload({
    metadata: { uploadedBy: user.id },
    folderId: 'folder_abc',
    onComplete: (file) => invalidateFileList(),
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    await upload(files);
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileSelect} />
      {uploads.map(u => (
        <div key={u.id}>
          {u.filename}: {u.status === 'uploading' ? `${u.progress}%` : u.status}
          {u.status === 'failed' && <button onClick={() => retry(u.id)}>Retry</button>}
        </div>
      ))}
    </div>
  );
}
```

#### useFiles

```tsx
import { useFiles } from '@filenest/react';

function FileList() {
  const {
    files,
    isLoading,
    isError,
    error,
    hasMore,
    loadMore,
    refresh,
    totalCount,
  } = useFiles({
    folderId: 'folder_abc',
    filters: {
      metadata: { patientId: 'P-12345' },
      tags: ['clinical'],
    },
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit: 20,
  });

  if (isLoading) return <Spinner />;
  if (isError) return <Error message={error.message} />;

  return (
    <div>
      <p>{totalCount} documents</p>
      {files.map(file => (
        <FileRow key={file.id} file={file} />
      ))}
      {hasMore && <button onClick={loadMore}>Load more</button>}
    </div>
  );
}
```

#### useSearch

```tsx
import { useSearch } from '@filenest/react';

function SearchResults() {
  const [query, setQuery] = useState('');

  const {
    results,
    facets,
    isLoading,
    totalCount,
    queryTimeMs,
    search,
    hasMore,
    loadMore,
  } = useSearch({
    debounceMs: 300,
    facets: ['documentType', 'tags'],
  });

  return (
    <div>
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          search({
            q: e.target.value,
            filters: { metadata: { patientId: 'P-12345' } },
          });
        }}
        placeholder="Search documents..."
      />
      {isLoading && <SearchSpinner />}
      <p>{totalCount} results in {queryTimeMs}ms</p>
      {results.map(file => (
        <SearchResult key={file.id} file={file} />
      ))}
    </div>
  );
}
```

#### useFile

```tsx
import { useFile } from '@filenest/react';

function FileDetail({ fileId }: { fileId: string }) {
  const { file, isLoading, mutate } = useFile(fileId, {
    includeVersions: true,
    includeProcessing: true,
  });

  const handleTagUpdate = async (tags: string[]) => {
    await filenest.files.update(fileId, { tags });
    mutate();  // Revalidate
  };

  return file ? <FileCard file={file} onTagUpdate={handleTagUpdate} /> : null;
}
```

#### useFolder

```tsx
import { useFolder } from '@filenest/react';

function FolderContents({ folderId }: { folderId: string | null }) {
  const { folder, files, subfolders, isLoading, breadcrumbs } = useFolder(folderId);

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <FolderGrid folders={subfolders} />
      <FileGrid files={files} />
    </div>
  );
}
```

### 3.8 Context and Imperative API

```tsx
import { useFileNest } from '@filenest/react';

function CustomUploadButton() {
  const filenest = useFileNest();

  const handleUpload = async (file: File) => {
    const result = await filenest.upload(file, {
      metadata: { uploadedBy: 'user_abc' },
      onProgress: (p) => setProgress(p.percentage),
    });
    console.log('Uploaded:', result.id);
  };

  return <button onClick={() => openFilePicker(handleUpload)}>Upload</button>;
}
```

---

## 4. Next.js SDK

### 4.1 Installation

```bash
npm install @filenest/nextjs
```

### 4.2 Route Handler (App Router)

```typescript
// app/api/filenest-token/route.ts
import { createUploadToken } from '@filenest/nextjs/server';
import { auth } from '@/auth';  // Your auth library

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { folderId, documentType } = await req.json();

  const token = await createUploadToken({
    apiKey: process.env.FILENEST_API_KEY!,
    projectId: process.env.FILENEST_PROJECT_ID!,
    constraints: {
      maxSize: 50 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf', 'image/*'],
      maxFiles: 10,
    },
    metadata: {
      uploadedBy: session.user.id,
      documentType: documentType || 'general',
    },
    folderId,
    expiresIn: 3600,
  });

  return Response.json(token);
}
```

### 4.3 Server Actions

```typescript
// app/actions/files.ts
'use server';
import { filenestServer } from '@filenest/nextjs/server';
import { revalidatePath } from 'next/cache';

const fn = filenestServer({
  apiKey: process.env.FILENEST_API_KEY!,
  projectId: process.env.FILENEST_PROJECT_ID!,
});

export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File;
  const patientId = formData.get('patientId') as string;

  const result = await fn.files.upload({
    filename: file.name,
    data: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    metadata: {
      patientId,
      documentType: 'LabReport',
    },
  });

  revalidatePath('/patients/' + patientId);
  return result;
}

export async function deleteFile(fileId: string) {
  await fn.files.delete(fileId);
  revalidatePath('/files');
}

export async function searchFiles(query: string, patientId: string) {
  return fn.search.query({
    q: query,
    filters: { metadata: { patientId } },
  });
}
```

### 4.4 Server Components

```tsx
// app/patients/[patientId]/documents/page.tsx
import { filenestServer } from '@filenest/nextjs/server';

const fn = filenestServer({
  apiKey: process.env.FILENEST_API_KEY!,
  projectId: process.env.FILENEST_PROJECT_ID!,
});

export default async function PatientDocumentsPage({
  params,
}: {
  params: { patientId: string };
}) {
  const { data: files } = await fn.files.list({
    metadata: { patientId: params.patientId },
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit: 50,
  });

  return (
    <div>
      <h1>Documents for Patient {params.patientId}</h1>
      <ul>
        {files.map(file => (
          <li key={file.id}>
            <a href={`/files/${file.id}`}>{file.filename}</a>
            <span>{file.metadata.documentType}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4.5 Webhook Handler

```typescript
// app/api/webhooks/filenest/route.ts
import { verifyWebhookSignature, parseWebhookEvent } from '@filenest/nextjs/server';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-filenest-signature') ?? '';

  const isValid = verifyWebhookSignature(
    body,
    signature,
    process.env.FILENEST_WEBHOOK_SECRET!
  );

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = parseWebhookEvent(body);

  switch (event.type) {
    case 'file.uploaded':
      await handleFileUploaded(event.data);
      break;
    case 'file.processed':
      await handleFileProcessed(event.data);
      break;
    case 'file.virus_detected':
      await handleVirusDetected(event.data);
      break;
  }

  return new Response('OK', { status: 200 });
}

async function handleFileUploaded(data: FileUploadedEvent) {
  // Notify relevant staff
  await notifyStaff({
    message: `New document uploaded: ${data.filename}`,
    patientId: data.metadata?.patientId,
  });
}
```

### 4.6 Middleware (Optional)

```typescript
// middleware.ts
import { fileNestMiddleware } from '@filenest/nextjs';

export const config = {
  matcher: '/api/filenest-token',
};

// Adds rate limiting and logging to the token endpoint
export default fileNestMiddleware({
  rateLimit: { requests: 10, window: 60 },  // 10 req/min per IP
});
```

---

## 5. Python SDK

### 5.1 Installation

```bash
pip install filenest
# or
poetry add filenest
```

### 5.2 Initialization

```python
from filenest import FileNest

fn = FileNest(
    api_key=os.environ["FILENEST_API_KEY"],
    project_id=os.environ["FILENEST_PROJECT_ID"],
    environment="production",
    base_url="https://api.filenest.io",  # Optional
    timeout=30.0,
    max_retries=3,
)
```

### 5.3 Async Client

```python
from filenest import AsyncFileNest
import asyncio

async def main():
    async with AsyncFileNest(
        api_key=os.environ["FILENEST_API_KEY"],
        project_id=os.environ["FILENEST_PROJECT_ID"],
    ) as fn:
        file = await fn.files.upload(
            filename="report.pdf",
            data=pdf_bytes,
            mime_type="application/pdf",
            metadata={"patientId": "P-12345", "documentType": "LabReport"},
        )
        print(f"Uploaded: {file.id}")

asyncio.run(main())
```

### 5.4 File Upload

```python
import filenest
from pathlib import Path

fn = filenest.FileNest(api_key=os.environ["FILENEST_API_KEY"])

# From bytes
with open("report.pdf", "rb") as f:
    file = fn.files.upload(
        filename="lab-report.pdf",
        data=f.read(),
        mime_type="application/pdf",
        metadata={
            "patientId": "P-12345",
            "documentType": "LabReport",
            "encounterId": "E-67890",
        },
        tags=["clinical", "lab"],
    )

# From file path (recommended for large files — uses streaming)
file = fn.files.upload_from_path(
    path=Path("/tmp/large-scan.dcm"),
    metadata={"patientId": "P-12345", "modality": "MRI"},
    on_progress=lambda p: print(f"{p.percentage:.1f}%"),
)

print(f"File ID: {file.id}")
print(f"Status: {file.status}")  # 'processing'
```

### 5.5 File Download

```python
# Get signed URL
url_response = fn.files.get_download_url("file_xyz789", ttl=3600)
print(url_response.url)

# Download to file
fn.files.download_to_path("file_xyz789", Path("/tmp/downloaded.pdf"))

# Download to bytes
data = fn.files.download_to_bytes("file_xyz789")
```

### 5.6 Search

```python
from filenest.types import SearchFilters, MetadataFilter

# Simple search
results = fn.search.query("discharge summary")

# Advanced search
results = fn.search.query(
    q="lab report abnormal",
    filters=SearchFilters(
        metadata=MetadataFilter(patientId="P-12345", documentType="LabReport"),
        tags=["urgent"],
        created_after=datetime(2026, 1, 1),
    ),
    facets=["documentType", "tags"],
    limit=20,
)

for file in results.data:
    print(f"{file.filename}: {file.metadata}")

print(f"Total: {results.pagination.total}")
print(f"Facets: {results.facets}")

# Paginate all results
for file in fn.search.iterate(q="discharge summary"):
    process(file)
```

### 5.7 Django Integration

```python
# settings.py
FILENEST = {
    "API_KEY": env("FILENEST_API_KEY"),
    "PROJECT_ID": env("FILENEST_PROJECT_ID"),
}

# views.py
from django.http import JsonResponse
from filenest.django import get_filenest

def upload_document(request, patient_id):
    fn = get_filenest()
    uploaded_file = request.FILES["file"]

    file = fn.files.upload(
        filename=uploaded_file.name,
        data=uploaded_file.read(),
        mime_type=uploaded_file.content_type,
        metadata={
            "patientId": patient_id,
            "documentType": request.POST.get("documentType"),
            "uploadedBy": str(request.user.id),
        },
    )

    return JsonResponse({"fileId": file.id, "status": file.status})
```

### 5.8 FastAPI Integration

```python
# dependencies.py
from functools import lru_cache
from filenest import AsyncFileNest
from .config import settings

@lru_cache(maxsize=1)
def get_filenest() -> AsyncFileNest:
    return AsyncFileNest(
        api_key=settings.FILENEST_API_KEY,
        project_id=settings.FILENEST_PROJECT_ID,
    )

# routes.py
from fastapi import APIRouter, Depends, UploadFile, File, Form
from .dependencies import get_filenest

router = APIRouter()

@router.post("/patients/{patient_id}/documents")
async def upload_patient_document(
    patient_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    fn: AsyncFileNest = Depends(get_filenest),
):
    data = await file.read()
    result = await fn.files.upload(
        filename=file.filename,
        data=data,
        mime_type=file.content_type,
        metadata={
            "patientId": patient_id,
            "documentType": document_type,
        },
    )
    return {"fileId": result.id, "status": result.status}
```

### 5.9 Webhook Verification

```python
from filenest import verify_webhook_signature

@app.post("/webhooks/filenest")
async def handle_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("x-filenest-signature", "")

    if not verify_webhook_signature(body, signature, settings.WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = json.loads(body)

    if event["type"] == "file.processed":
        await handle_file_processed(event["data"])
    elif event["type"] == "file.virus_detected":
        await handle_virus_detected(event["data"])

    return {"status": "ok"}
```

### 5.10 Pydantic Models

```python
from filenest.types import (
    File,
    FileStatus,
    FileVersion,
    Folder,
    SearchResults,
    SearchFilters,
    AuditLog,
    ProcessingJob,
    Webhook,
    UploadToken,
    PHIDetectionResult,
)

# All SDK responses are Pydantic models
file: File = fn.files.get("file_xyz789")
assert isinstance(file, File)
assert file.status in FileStatus
print(file.model_dump())  # Dict representation
print(file.model_dump_json())  # JSON string
```

---

## 6. SDK Error Handling

### 6.1 Error Hierarchy (TypeScript)

```typescript
import {
  FileNestError,         // Base error
  AuthenticationError,   // 401 — invalid API key
  AuthorizationError,    // 403 — insufficient scope
  NotFoundError,         // 404
  FileNotFoundError,     // 404 file specifically
  ConflictError,         // 409
  WORMViolationError,    // 409 WORM
  LegalHoldError,        // 409 legal hold
  ValidationError,       // 422
  MetadataValidationError, // 422 metadata schema
  RateLimitError,        // 429
  NetworkError,          // Network-level failures
  StorageError,          // Storage provider errors
} from '@filenest/node';
```

### 6.2 TypeScript Error Handling

```typescript
import { FileNestError, WORMViolationError, MetadataValidationError } from '@filenest/node';

try {
  await filenest.files.delete('file_xyz789');
} catch (error) {
  if (error instanceof WORMViolationError) {
    console.error('Cannot delete WORM-committed file');
  } else if (error instanceof LegalHoldError) {
    console.error('File is under legal hold:', error.reason);
  } else if (error instanceof MetadataValidationError) {
    console.error('Metadata errors:', error.validationErrors);
    // [{ field: 'documentType', message: 'Invalid value', value: 'bad' }]
  } else if (error instanceof FileNestError) {
    console.error(`FileNest error ${error.code}:`, error.message);
  } else {
    throw error;  // Re-throw unknown errors
  }
}
```

### 6.3 Python Error Handling

```python
from filenest.exceptions import (
    FileNestError,
    AuthenticationError,
    AuthorizationError,
    FileNotFoundError,
    WORMViolationError,
    LegalHoldError,
    MetadataValidationError,
    RateLimitError,
)

try:
    fn.files.delete("file_xyz789")
except WORMViolationError:
    logger.error("Cannot delete WORM-committed file")
except LegalHoldError as e:
    logger.error(f"Legal hold active: {e.reason}")
except MetadataValidationError as e:
    for err in e.validation_errors:
        logger.error(f"Field {err['field']}: {err['message']}")
except RateLimitError as e:
    # SDK handles retries automatically, but if max retries exceeded:
    logger.warning(f"Rate limited. Retry after {e.retry_after}s")
except FileNestError as e:
    logger.error(f"FileNest error {e.code}: {e.message}")
```

---

## 7. Versioning and Compatibility

### 7.1 Versioning Policy

- **Semantic versioning**: `major.minor.patch`
- **Major** (breaking): API shape changes, removed methods
- **Minor** (additive): new methods, new optional parameters
- **Patch**: bug fixes, performance improvements

### 7.2 API Version Pinning

```typescript
const filenest = new FileNest({
  apiKey: '...',
  apiVersion: '2026-06-15',  // Pin to specific API version
});
```

### 7.3 Deprecation Notices

Deprecated SDK methods will:
1. Log a deprecation warning to console (development mode)
2. Continue to function for at least 6 months
3. Be removed in the next major version

```typescript
// Deprecated methods show warning
const url = await filenest.files.getSignedUrl('file_abc');
// ⚠️ FileNest SDK: getSignedUrl() is deprecated. Use getDownloadUrl() instead.
```
