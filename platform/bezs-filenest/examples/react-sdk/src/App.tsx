/**
 * App — React SDK example root with a simple client-side router.
 *
 * Demonstrates all three SDK tiers in a plain Vite + React app (no Next.js):
 *   Tier 1 — Components: FileUpload, FilePreview, FileViewer
 *   Tier 2 — Managed hooks: useUpload, useFiles, useInfiniteFiles, useSearch, useFile, useFolder
 *   Tier 3 — Headless: useFileNest(), useUploadToken()
 */

import { useState } from "react";
import { ProviderSetupPage } from "./pages/ProviderSetup.js";
import { ComponentsPage } from "./pages/Components.js";
import { UploadHookPage } from "./pages/UploadHook.js";
import { FilesPage } from "./pages/Files.js";
import { InfiniteFilesPage } from "./pages/InfiniteFiles.js";
import { SearchPage } from "./pages/Search.js";
import { HeadlessPage } from "./pages/Headless.js";
import { TokenPage } from "./pages/Token.js";

type Page =
  | "setup"
  | "components"
  | "upload-hook"
  | "files"
  | "infinite-files"
  | "search"
  | "headless"
  | "token";

const nav: { label: string; page: Page; section: string }[] = [
  { section: "Getting Started", label: "Provider setup", page: "setup" },
  { section: "Tier 1 — Components", label: "FileUpload / FilePreview / FileViewer", page: "components" },
  { section: "Tier 2 — Managed hooks", label: "useUpload", page: "upload-hook" },
  { section: "Tier 2 — Managed hooks", label: "useFiles", page: "files" },
  { section: "Tier 2 — Managed hooks", label: "useInfiniteFiles", page: "infinite-files" },
  { section: "Tier 2 — Managed hooks", label: "useSearch", page: "search" },
  { section: "Tier 3 — Headless", label: "useFileNest()", page: "headless" },
  { section: "Tier 3 — Headless", label: "useUploadToken", page: "token" },
];

function Sidebar({ current, onChange }: { current: Page; onChange: (p: Page) => void }) {
  const sections = [...new Set(nav.map((n) => n.section))];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">⚡ @filenest/react</div>
      {sections.map((section) => (
        <div key={section}>
          <div className="sidebar-section">{section}</div>
          {nav
            .filter((n) => n.section === section)
            .map((n) => (
              <span
                key={n.page}
                className={`sidebar-link${current === n.page ? " active" : ""}`}
                onClick={() => onChange(n.page)}
              >
                {n.label}
              </span>
            ))}
        </div>
      ))}
    </aside>
  );
}

export function App() {
  const [page, setPage] = useState<Page>("setup");

  const renderPage = () => {
    switch (page) {
      case "setup": return <ProviderSetupPage />;
      case "components": return <ComponentsPage />;
      case "upload-hook": return <UploadHookPage />;
      case "files": return <FilesPage />;
      case "infinite-files": return <InfiniteFilesPage />;
      case "search": return <SearchPage />;
      case "headless": return <HeadlessPage />;
      case "token": return <TokenPage />;
    }
  };

  return (
    <div className="layout">
      <Sidebar current={page} onChange={setPage} />
      <main className="main">{renderPage()}</main>
    </div>
  );
}
