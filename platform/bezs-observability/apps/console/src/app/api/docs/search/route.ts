// GET /api/docs/search — returns the full docs manifest for client-side fuse.js search.
// The manifest is built by walking src/content/docs at request time.
import { NextResponse } from "next/server";
import { getDocsManifest } from "@/lib/docs";

export async function GET() {
  const manifest = getDocsManifest();
  return NextResponse.json(manifest, {
    headers: {
      // Cache for 5 minutes in browser — content rarely changes.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
