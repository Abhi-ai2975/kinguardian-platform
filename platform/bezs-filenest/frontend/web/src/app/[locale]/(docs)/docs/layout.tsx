/**
 * (docs)/docs/layout — Shell layout for all documentation pages.
 *
 * Public route — no auth required. Renders DocsHeader and provides the
 * three-column page structure (sidebar | content | TOC). The sidebar and
 * TOC are rendered per-page inside [[...slug]]/page.tsx so they receive
 * page-specific heading data; this layout only provides the fixed header.
 *
 * @module
 */
import type { Metadata } from "next";
import { DocsHeader } from "@/modules/client/docs/components/DocsHeader";

export const metadata: Metadata = {
  title: {
    template: "%s — FileNest Docs",
    default: "FileNest Docs",
  },
  description:
    "Documentation for FileNest — enterprise file infrastructure platform.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DocsHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </div>
  );
}
