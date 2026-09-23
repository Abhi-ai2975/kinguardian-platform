import Link from "next/link";

const demos = [
  {
    group: "Server SDK (@filenest/nextjs/server)",
    color: "#7c3aed",
    items: [
      { href: "/server-component", title: "Server Component", desc: "RSC fetching a file list with filenestServer().files.list()" },
      { href: "/server-action", title: "Server Action", desc: "Form that uploads a file via a Next.js server action" },
      { href: "/folders", title: "Folder Management", desc: "ensurePath, getByPath, list, and listFiles — all server-side in an async RSC" },
    ],
  },
  {
    group: "Upload Components (@filenest/react)",
    color: "#0891b2",
    items: [
      { href: "/upload-dropzone", title: "FileUpload (dropzone)", desc: "Drag-and-drop zone with per-file progress bars and error states" },
      { href: "/upload-button", title: "FileUpload (button)", desc: "Click-to-upload button variant — minimal UI, same underlying logic" },
      { href: "/upload-programmatic", title: "useUpload hook", desc: "Programmatic upload — trigger via button, track per-file progress state" },
    ],
  },
  {
    group: "Preview Components (@filenest/react)",
    color: "#059669",
    items: [
      { href: "/file-preview", title: "FilePreview", desc: "Inline preview panel — images render directly, PDFs via iframe" },
      { href: "/file-viewer", title: "FileViewer", desc: "Full-page viewer wrapper with toolbar and download button" },
    ],
  },
  {
    group: "Data Hooks (@filenest/react)",
    color: "#d97706",
    items: [
      { href: "/files", title: "useFiles", desc: "TanStack Query-backed paginated file list with filters and load more" },
      { href: "/infinite-files", title: "useInfiniteFiles", desc: "useInfiniteQuery-backed append-page list — sentinel triggers the next fetch" },
      { href: "/file-detail", title: "useFile", desc: "Single file detail card with live status and revalidation" },
      { href: "/folder", title: "useFolder", desc: "Folder navigation with breadcrumbs and subfolder listing" },
    ],
  },
  {
    group: "Search (@filenest/react + @filenest/nextjs/server)",
    color: "#7c3aed",
    items: [
      { href: "/search", title: "Server Search (RSC)", desc: "RSC calling filenestServer().search.query() — results at first paint" },
      { href: "/search-client", title: "useSearch (client)", desc: "Debounced full-text + faceted search hook — live as you type, client-side" },
    ],
  },
  {
    group: "Token & Headless (@filenest/react)",
    color: "#0f766e",
    items: [
      { href: "/upload-token", title: "useUploadToken", desc: "Token lifecycle hook — status, manual refresh, lazy mode, custom fetcher" },
      { href: "/headless-upload", title: "useFileNest() headless", desc: "All 17 context methods: 3-step upload, folders, search, download URL" },
    ],
  },
  {
    group: "Webhooks (@filenest/nextjs/server)",
    color: "#dc2626",
    items: [
      { href: "/webhooks", title: "Webhook Events", desc: "Route handler using verifyWebhookSignature + parseWebhookEvent; log display" },
    ],
  },
];

export default function IndexPage() {
  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>FileNest SDK — Next.js Examples</h1>
          <span className="badge badge-blue">v0.1.0</span>
        </div>
        <p className="page-sub">
          A comprehensive demo of <code>@filenest/nextjs</code> and <code>@filenest/react</code>.
          Each page shows a running demo alongside the source code that powers it.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title">Quick setup</h2>
            <pre className="code-block mt-3" style={{ fontSize: 12 }}>{`# 1. Copy env file
cp .env.example .env.local

# 2. Fill in your API key and project ID (from the FileNest Console → API Keys)
FILENEST_API_KEY=fn_live_...
FILENEST_PROJECT_ID=proj_...
FILENEST_API_URL=http://localhost:8000

# 3. Install dependencies and start the dev server
pnpm install
pnpm dev       # runs on http://localhost:3001`}</pre>
          </div>
        </div>

        {demos.map((group) => (
          <div key={group.group}>
            <h2
              className="text-sm"
              style={{ fontWeight: 600, color: group.color, marginBottom: 10, marginTop: 8 }}
            >
              {group.group}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                  <div className="card card-link">
                    <div className="card-body">
                      <div className="card-title" style={{ color: group.color }}>{item.title}</div>
                      <p className="card-desc mt-2">{item.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
