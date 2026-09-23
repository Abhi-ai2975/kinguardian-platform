/**
 * POST /api/internal/verify-api-key
 *
 * Verifies a FileNest API key against BetterAuth and returns the tenant context
 * required by the FastAPI backend to build a TenantContext for each request.
 *
 * This endpoint is internal — it must not be reachable from the public internet
 * in production. In production, restrict via network policy or a shared secret
 * header validated before this handler runs.
 *
 * @module
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(req: NextRequest) {
  if (INTERNAL_SECRET) {
    const secret = req.headers.get("x-internal-secret");
    if (secret !== INTERNAL_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);

  if (!body?.key || typeof body.key !== "string") {
    return NextResponse.json({ error: "Missing or invalid key" }, { status: 400 });
  }

  const { key } = body as { key: string };

  let result: Awaited<ReturnType<typeof auth.api.verifyApiKey>>;
  try {
    result = await auth.api.verifyApiKey({ body: { key } });
  } catch {
    return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 });
  }

  if (!result?.valid || !result.key) {
    return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 });
  }

  const metadata = (result.key.metadata ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    userId: result.key.userId,
    organizationId: (metadata.organizationId as string) ?? null,
    projectId: (metadata.projectId as string) ?? null,
    scopes: Array.isArray(metadata.scopes) ? metadata.scopes : [],
    isTestMode: key.startsWith("fn_test_"),
  });
}
