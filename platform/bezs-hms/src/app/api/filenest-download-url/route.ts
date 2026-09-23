/**
 * GET /api/filenest-download-url?fileId={id}
 *
 * Layer: presentation / API route
 *
 * Returns a short-lived presigned download URL for a given FileNest file ID.
 * Used by client components (ProfilePhotoUpload) to display file previews
 * without exposing the FileNest API key to the browser.
 *
 * The signed URL is valid for 1 hour — sufficient for a single page session.
 * Components re-fetch this endpoint after each new upload to get a fresh URL.
 *
 * Query params:
 *   fileId       — required FileNest file ID string
 *   disposition  — optional "inline" | "attachment" (default "attachment").
 *                  "inline" lets the browser render the file (PDF/image) in a
 *                  new tab instead of forcing a download.
 *
 * Response: { url: string; expiresAt: string }
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import { filenest } from "@/lib/filenest.server";

export async function GET(req: Request): Promise<Response> {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Validate required fileId param ────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) {
    return Response.json({ error: "fileId query param is required" }, { status: 400 });
  }
  const disposition =
    searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  // ── Fetch presigned download URL from FileNest (1 hr TTL) ─────────────────
  const { url, expiresAt } = await filenest.files.getDownloadUrl(fileId, {
    ttl: 3600,
    disposition,
  });

  return Response.json({ url, expiresAt });
}
