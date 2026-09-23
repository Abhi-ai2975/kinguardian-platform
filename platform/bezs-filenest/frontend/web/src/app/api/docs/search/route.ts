/**
 * api/docs/search — Search manifest endpoint for client-side docs search.
 *
 * Returns a JSON array of all docs pages with title, description, and a
 * plain-text excerpt. The DocsSearch component fetches this once per session
 * and searches it locally via Fuse.js.
 *
 * @module
 */
import { NextResponse } from "next/server";
import { getDocsManifest } from "@/modules/client/docs/utils/docs";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const manifest = getDocsManifest();
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
