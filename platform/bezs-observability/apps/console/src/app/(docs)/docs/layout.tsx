// Docs layout — independent shell for /docs, has no dashboard sidebar or header.
// Renders the DocsHeader, left sidebar, and a slot for the page content.
import type { Metadata } from "next";
import { DocsHeader } from "@/components/docs/DocsHeader";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

export const metadata: Metadata = {
  title: { default: "Docs — Watcher", template: "%s — Watcher Docs" },
  description: "Watcher documentation — guides, SDK references, and API docs.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DocsHeader />
      <div className="mx-auto flex max-w-7xl gap-8 px-4 sm:px-6">
        <DocsSidebar />
        {children}
      </div>
    </div>
  );
}
