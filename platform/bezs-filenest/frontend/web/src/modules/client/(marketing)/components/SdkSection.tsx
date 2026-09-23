/**
 * SdkSection — SDK tabs on the landing page showing Node.js, React, and Python snippets.
 * @module
 */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "node" | "react" | "python";

const TABS: { id: Tab; label: string }[] = [
  { id: "node",   label: "Node.js" },
  { id: "react",  label: "React" },
  { id: "python", label: "Python" },
];

const SNIPPETS: Record<Tab, string> = {
  node: `import { FileNest } from "@filenest/node";

const fn = new FileNest({
  apiKey: process.env.FILENEST_API_KEY!,
  projectId: process.env.FILENEST_PROJECT_ID!,
});

// Upload a file
const file = await fn.files.upload({
  filename: "report.pdf",
  data: buffer,
  mimeType: "application/pdf",
  metadata: { clientId: "acme", type: "invoice" },
});

// Get a signed download URL (60 min TTL)
const { url } = await fn.files.getDownloadUrl(file.id, { ttl: 3600 });

// Search
const results = await fn.search.query({ q: "invoice 2026" });`,

  react: `import { FileNestProvider, FileUpload, FileExplorer } from "@filenest/react";

// 1. Wrap your app
<FileNestProvider
  tokenEndpoint="/api/filenest-token"
  projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
>
  <App />
</FileNestProvider>

// 2. Drop in an uploader
<FileUpload
  accept={["application/pdf", "image/*"]}
  maxSize={50 * 1024 * 1024}
  multiple
  metadata={{ uploadedBy: userId }}
  onComplete={(files) => console.log(files)}
/>

// 3. Or a full file browser
<FileExplorer
  showSearch
  showFilters
  actions={["download", "delete", "move"]}
/>`,

  python: `from filenest import AsyncFileNest

async with AsyncFileNest(
    api_key=os.environ["FILENEST_API_KEY"],
    project_id=os.environ["FILENEST_PROJECT_ID"],
) as fn:
    # Upload
    file = await fn.files.upload(
        filename="report.pdf",
        data=pdf_bytes,
        mime_type="application/pdf",
        metadata={"client_id": "acme", "type": "invoice"},
    )

    # Search
    results = await fn.search.query(q="invoice 2026")

    # Compliance
    await fn.compliance.set_legal_hold(
        file.id, reason="Audit 2026-Q2", indefinite=True
    )`,
};

export function SdkSection() {
  const [active, setActive] = useState<Tab>("node");

  return (
    <section className="px-4 py-20 sm:px-6 bg-muted/30">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One API, every language
          </h2>
          <p className="mt-4 text-muted-foreground">
            First-class SDKs for your stack — typed, async, and production-ready.
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b bg-muted/40">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cn(
                  "px-5 py-3 text-sm font-medium transition-colors",
                  active === id
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Code */}
          <pre className="overflow-x-auto p-5 text-xs leading-relaxed font-mono">
            <code>{SNIPPETS[active]}</code>
          </pre>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Install with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {active === "python" ? "pip install filenest" : `npm install @filenest/${active === "react" ? "react" : "node"}`}
          </code>
        </p>
      </div>
    </section>
  );
}
