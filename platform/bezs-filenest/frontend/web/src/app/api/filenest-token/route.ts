/**
 * POST /api/filenest-token — issues a short-lived upload token for @filenest/react.
 *
 * The FileNest API key never reaches the browser. Instead, authenticated client
 * components call this endpoint, which validates the session then requests a
 * scoped upload token from the FileNest backend.
 *
 * The token endpoint URL is passed to <FileNestProvider tokenEndpoint="/api/filenest-token">
 * so the SDK can refresh tokens automatically before uploads.
 *
 * @module
 */
import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/server/auth/get-session";

/**
 * Issue a scoped FileNest upload token for the authenticated user.
 *
 * Request body (optional):
 *   folderId      — restrict the upload to a specific folder
 *   metadata      — default metadata to attach to uploaded files
 *
 * Returns a short-lived token the browser can use for direct uploads.
 */
export async function POST(request: Request) {
  const session = await getServerSession();

  // Never issue tokens to unauthenticated requests.
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { folderId, metadata } = body as {
    folderId?: string;
    metadata?: Record<string, unknown>;
  };

  // Phase 5: replace this with a real call to the FileNest backend once the
  // upload token endpoint is implemented in services/file.
  // For now, return a stub so the client SDK wiring can be tested.
  return NextResponse.json(
    {
      error: "Upload tokens not yet implemented — Phase 5 deliverable",
    },
    { status: 501 },
  );
}
