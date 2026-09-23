/**
 * POST /api/upload — server-side upload proxy for developer testing.
 *
 * The browser sends FormData to this endpoint. The server then:
 *   1. Calls the FileNest backend to get a presigned PUT URL.
 *   2. Reads the file bytes and PUTs them to S3 from Node.js.
 *   3. Calls confirm so the backend transitions the file to processing/ready.
 *
 * This mode is useful for testing the full upload pipeline (validation, virus
 * scan triggers, metadata storage) without needing the browser to contact S3
 * directly. For production workloads, use the presigned URL mode instead —
 * it is faster and does not route bytes through this server.
 *
 * Multipart is not supported in server-side mode. Files larger than
 * NEXT_PUBLIC limits (default ~4 MB for Vercel) should use presigned URL mode.
 *
 * @module
 */
import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

const API_URL = process.env.FILENEST_API_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "file and projectId are required" }, { status: 400 });
  }

  const folderId = formData.get("folderId") as string | null;
  const tagsRaw = (formData.get("tags") as string | null) ?? "[]";
  const metadataRaw = (formData.get("metadata") as string | null) ?? "{}";

  let tags: string[];
  let metadata: Record<string, unknown>;
  try {
    tags = JSON.parse(tagsRaw) as string[];
    metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid tags or metadata JSON" }, { status: 400 });
  }

  const token = await getAuthToken();

  // Step 1 — initiate upload → get presigned URL
  const initRes = await fetch(
    `${API_URL}/v1/projects/${projectId}/files/upload`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        folder_id: folderId || null,
        tags,
        metadata,
      }),
    },
  );

  if (!initRes.ok) {
    const body = await initRes.json().catch(() => ({})) as { message?: string };
    return NextResponse.json(
      { error: body.message ?? "Failed to initiate upload" },
      { status: initRes.status },
    );
  }

  const { file_id, upload_url } = await initRes.json() as {
    file_id: string;
    upload_url: string;
  };

  // Step 2 — upload bytes from Node.js to S3
  const fileBuffer = await file.arrayBuffer();
  const s3Res = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: fileBuffer,
  });

  if (!s3Res.ok) {
    return NextResponse.json(
      { error: `Storage PUT failed: ${s3Res.status}` },
      { status: 502 },
    );
  }

  // Step 3 — confirm upload
  const confirmRes = await fetch(
    `${API_URL}/v1/projects/${projectId}/files/${file_id}/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!confirmRes.ok) {
    const body = await confirmRes.json().catch(() => ({})) as { message?: string };
    return NextResponse.json(
      { error: body.message ?? "Failed to confirm upload" },
      { status: confirmRes.status },
    );
  }

  const confirmed = await confirmRes.json() as { id: string; status: string };
  return NextResponse.json({ file_id: confirmed.id, status: confirmed.status });
}
