// GET /llms-full.txt — returns every documentation page concatenated into a
// single plain-text file, ordered by the sidebar navigation.
// AI assistants with large context windows can fetch this once and have
// the complete Watcher24 documentation available without multiple requests.
import { NextResponse } from "next/server";
import { docsNav } from "@/lib/docs-nav";
import { getDoc } from "@/lib/docs";

export const dynamic = "force-dynamic";

export async function GET() {
  const sections: string[] = [];

  // Header identifying this as llms-full.txt
  sections.push(
    "# Watcher24 — Full Documentation (llms-full.txt)",
    `# Generated: ${new Date().toISOString()}`,
    "# Source: https://watcher24.io/llms.txt (concise) | https://watcher24.io/llms-full.txt (this file)",
    "",
    "---",
    "",
  );

  for (const section of docsNav) {
    sections.push(`# SECTION: ${section.title}`, "");

    for (const item of section.items) {
      // Convert href like "/docs/sdks/javascript" → slug ["sdks", "javascript"]
      const slug = item.href === "/docs" ? [] : item.href.replace("/docs/", "").split("/");
      const doc = getDoc(slug);
      if (!doc) continue;

      sections.push(
        `## PAGE: ${item.title}`,
        `## URL: ${item.href}`,
        "",
        doc.content.trim(),
        "",
        "---",
        "",
      );
    }
  }

  const body = sections.join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Cache for 5 minutes — docs don't change that often.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
