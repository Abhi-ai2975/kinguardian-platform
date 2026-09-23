// Console proxy for public browser token management.
//
// The console UI cannot call the IAM internal API directly because:
//   1. The internal API requires a server-side shared secret (INTERNAL_API_SECRET).
//   2. The IAM service is not reachable from the browser (private network).
//
// This route:
//   - Verifies the user is authenticated via their console session.
//   - Resolves the active organisation ID from the session (public tokens
//     are always scoped to the org, not the user).
//   - Forwards the request to IAM's /api/internal/public-tokens with the
//     X-Internal-Secret header. IAM owns all token creation and storage.
//
// All three methods (GET, POST, DELETE) are proxied.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";

const IAM_URL = process.env.IAM_URL ?? "http://localhost:5000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

// requireSession verifies the user is authenticated and has an active org.
// Returns a 401/400 response when the check fails, or the orgId on success.
async function requireSession(req: NextRequest): Promise<{ orgId: string } | NextResponse> {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    return NextResponse.json(
      { error: "No active organisation — select an organisation first" },
      { status: 400 },
    );
  }
  return { orgId };
}

// iamHeaders returns the headers needed for IAM internal API calls.
function iamHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-internal-secret": INTERNAL_SECRET,
  };
}

// GET /api/public-tokens — list public tokens for the active org.
export async function GET(req: NextRequest) {
  const result = await requireSession(req);
  if (result instanceof NextResponse) return result;
  const { orgId } = result;

  try {
    const res = await fetch(
      `${IAM_URL}/api/internal/public-tokens?orgId=${encodeURIComponent(orgId)}`,
      { headers: iamHeaders(), cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach IAM service" }, { status: 502 });
  }
}

// POST /api/public-tokens — create a public token for the active org.
// Body: { name: string, allowedOrigins: string[], minuteRateLimit?: number }
// Returns the raw token in the response — it is never stored and never retrievable again.
export async function POST(req: NextRequest) {
  const result = await requireSession(req);
  if (result instanceof NextResponse) return result;
  const { orgId } = result;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const res = await fetch(`${IAM_URL}/api/internal/public-tokens`, {
      method: "POST",
      headers: iamHeaders(),
      body: JSON.stringify({ ...(body as object), orgId }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach IAM service" }, { status: 502 });
  }
}

// DELETE /api/public-tokens?id=xxx — revoke a public token by its DB id.
// Only tokens belonging to the active org can be revoked via this endpoint.
export async function DELETE(req: NextRequest) {
  const result = await requireSession(req);
  if (result instanceof NextResponse) return result;
  const { orgId } = result;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Verify ownership: list the org's tokens and confirm the id belongs to this org.
  // This prevents one org from revoking another org's tokens by guessing IDs.
  try {
    const listRes = await fetch(
      `${IAM_URL}/api/internal/public-tokens?orgId=${encodeURIComponent(orgId)}`,
      { headers: iamHeaders(), cache: "no-store" },
    );
    if (!listRes.ok) {
      return NextResponse.json({ error: "Could not verify token ownership" }, { status: 502 });
    }
    const { tokens } = (await listRes.json()) as { tokens: { id: string }[] };
    const owned = tokens.some((t) => t.id === id);
    if (!owned) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach IAM service" }, { status: 502 });
  }

  try {
    const res = await fetch(
      `${IAM_URL}/api/internal/public-tokens?id=${encodeURIComponent(id)}`,
      { method: "DELETE", headers: iamHeaders() },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach IAM service" }, { status: 502 });
  }
}
