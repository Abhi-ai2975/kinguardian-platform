"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    title: "Getting Started",
    links: [
      { href: "/", label: "Overview" },
    ],
  },
  {
    title: "Server SDK",
    links: [
      { href: "/server-component", label: "Server Component" },
      { href: "/server-action", label: "Server Action" },
      { href: "/folders", label: "Folder Management" },
    ],
  },
  {
    title: "Upload Components",
    links: [
      { href: "/upload-dropzone", label: "FileUpload (dropzone)" },
      { href: "/upload-button", label: "FileUpload (button)" },
      { href: "/upload-programmatic", label: "useUpload hook" },
    ],
  },
  {
    title: "Preview",
    links: [
      { href: "/file-preview", label: "FilePreview" },
      { href: "/file-viewer", label: "FileViewer" },
    ],
  },
  {
    title: "Data Hooks",
    links: [
      { href: "/files", label: "useFiles" },
      { href: "/infinite-files", label: "useInfiniteFiles" },
      { href: "/file-detail", label: "useFile" },
      { href: "/folder", label: "useFolder" },
    ],
  },
  {
    title: "Search",
    links: [
      { href: "/search", label: "Server Search (RSC)" },
      { href: "/search-client", label: "useSearch (client)" },
    ],
  },
  {
    title: "Token & Headless",
    links: [
      { href: "/upload-token", label: "useUploadToken" },
      { href: "/headless-upload", label: "useFileNest() headless" },
    ],
  },
  {
    title: "Webhooks",
    links: [
      { href: "/webhooks", label: "Webhook Events" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">⚡ FileNest SDK</div>
      {sections.map((section) => (
        <div key={section.title}>
          <div className="sidebar-section">{section.title}</div>
          {section.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link${pathname === link.href ? " active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
