/**
 * POST /api/filenest-token
 *
 * Issues a short-lived upload token for @filenest/react components in the browser.
 * The browser never sees your API key — only this short-lived token.
 *
 * In production: verify the user's session before issuing a token.
 */

import { createUploadToken } from "@filenest/nextjs/server";

export async function POST(req: Request) {
  // In production, authenticate the request before issuing a token:
  //   const session = await getServerSession();
  //   if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    folderId?: string;
    metadata?: Record<string, unknown>;
  };

  const token = await createUploadToken({
    apiKey: process.env.FILENEST_API_KEY!,
    projectId: process.env.FILENEST_PROJECT_ID!,
    baseUrl: process.env.FILENEST_API_URL,
    maxSize: 100 * 1024 * 1024,           // 100 MB per file
    allowedMimeTypes: ["image/*", "application/pdf", "video/*", "audio/*"],
    maxFiles: 10,
    folderId: body.folderId,
    metadata: body.metadata,
    expiresIn: 3600,                        // 1 hour
  });

  return Response.json(token);
}
