// Internal API — public token management.
//
// Called exclusively by the console (never by end-users). Protected by the
// INTERNAL_API_SECRET shared secret so the console can create, list, and
// revoke public browser tokens without going through the better-auth client.
//
// Public tokens share the same Apikey row as secret keys and can be linked to
// the same Application as a secret key — events from both sources land under
// the same app in the dashboard, with source="browser" vs source="server".
//
// Public tokens differ from secret API keys in three ways:
//   1. keyType = "public"  — gateway enforces origin allowlist + write-only access
//   2. allowedOrigins      — CORS allowlist; gateway rejects unrecognised origins
//   3. minuteRateLimit     — per-minute hard cap to limit burst abuse if token leaks
//
// The raw token is returned once on creation and never stored — only the
// SHA-256 hash is persisted (same scheme as better-auth secret keys).
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../../prisma/db";
import { getOrgPlan, PLAN_LIMITS } from "@/modules/server/auth-provider/plan-limits";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

// requireInternalAuth verifies the x-internal-secret header.
// Returns a 401 response if the secret is wrong or missing.
function requireInternalAuth(req: NextRequest): NextResponse | null {
  if (!INTERNAL_SECRET) return null; // dev shortcut: no secret configured → open
  const provided = req.headers.get("x-internal-secret");
  if (provided !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// hashKey replicates the gateway's SHA-256 base64url-no-padding scheme.
// The gateway's keyvalidator hashes the raw key the same way before DB lookup,
// so both sides must produce identical output for validation to succeed.
function hashKey(rawKey: string): string {
  return crypto
    .createHash("sha256")
    .update(rawKey)
    .digest("base64url")
    .replace(/=/g, "");
}

// GET /api/internal/public-tokens?orgId=xxx
// Lists all public tokens for an organisation (never returns the raw key).
export async function GET(req: NextRequest) {
  const authErr = requireInternalAuth(req);
  if (authErr) return authErr;

  const orgId = new URL(req.url).searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const tokens = await prisma.apikey.findMany({
    where: { referenceId: orgId, keyType: "public" },
    select: {
      id: true,
      name: true,
      start: true,
      enabled: true,
      allowedOrigins: true,
      minuteRateLimit: true,
      appId: true,
      createdAt: true,
      lastRequest: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tokens });
}

// POST /api/internal/public-tokens
// Creates a new public token. Returns the raw token once — never stored.
// Body: { orgId, name, allowedOrigins: string[], minuteRateLimit?: number }
export async function POST(req: NextRequest) {
  const authErr = requireInternalAuth(req);
  if (authErr) return authErr;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orgId, name, allowedOrigins, minuteRateLimit, appId } = body as {
    orgId?: string;
    name?: string;
    allowedOrigins?: unknown;
    minuteRateLimit?: unknown;
    // appId links the token to the same Application as the server-side secret key
    // so browser and server events are grouped under the same app in the dashboard.
    appId?: string;
  };

  if (!orgId)
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  if (!name || typeof name !== "string")
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  // Validate allowedOrigins — must be an array of https:// URLs (or localhost)
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
    return NextResponse.json(
      { error: "allowedOrigins must be a non-empty array" },
      { status: 400 },
    );
  }
  if (allowedOrigins.length > 10) {
    return NextResponse.json(
      { error: "allowedOrigins may contain at most 10 origins" },
      { status: 400 },
    );
  }
  for (const origin of allowedOrigins) {
    if (typeof origin !== "string") {
      return NextResponse.json(
        { error: "each origin must be a string" },
        { status: 400 },
      );
    }
    if (
      !origin.startsWith("https://") &&
      !origin.startsWith("http://localhost")
    ) {
      return NextResponse.json(
        {
          error: `invalid origin: "${origin}". Must start with https:// or http://localhost`,
        },
        { status: 400 },
      );
    }
  }

  const rateLimit =
    typeof minuteRateLimit === "number" && minuteRateLimit > 0
      ? Math.min(minuteRateLimit, 10_000)
      : 1000;

  // Verify the org exists before creating a token for it
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json(
      { error: "Organisation not found" },
      { status: 404 },
    );
  }

  // Enforce per-plan public token limit before creating.
  const plan = await getOrgPlan(orgId);
  const tokenLimit = PLAN_LIMITS[plan].publicTokens;
  const tokenCount = await prisma.apikey.count({
    where: { referenceId: orgId, keyType: "public", enabled: true },
  });
  if (tokenCount >= tokenLimit) {
    return NextResponse.json(
      { error: `Your plan allows up to ${tokenLimit} public token${tokenLimit === 1 ? "" : "s"}. Upgrade your plan to create more.` },
      { status: 403 },
    );
  }

  // If an appId was provided, verify it belongs to this org.
  // This prevents one org from linking a public token to another org's app.
  if (appId) {
    const app = await prisma.application.findUnique({
      where: { id: appId },
      select: { id: true, organizationId: true },
    });
    if (!app || app.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Application not found or does not belong to this organisation" },
        { status: 404 },
      );
    }
  }

  // Generate token: wpub_ prefix + 32 random bytes (base64url)
  const rawToken = "wpub_" + crypto.randomBytes(32).toString("base64url");
  const hash = hashKey(rawToken);
  const start = rawToken.substring(0, 8); // "wpub_xxx" — shown in UI instead of full token

  const created = await prisma.apikey.create({
    data: {
      id: crypto.randomUUID(),
      name,
      key: hash,
      start,
      prefix: "wpub_",
      referenceId: orgId,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      keyType: "public",
      allowedOrigins: allowedOrigins as string[],
      minuteRateLimit: rateLimit,
      // Link to the application so gateway tags events with the correct application_id.
      // Null when no app was specified — token is org-level (events still ingest, just unscoped).
      ...(appId ? { appId } : {}),
    },
    select: {
      id: true,
      name: true,
      start: true,
      allowedOrigins: true,
      minuteRateLimit: true,
      appId: true,
      createdAt: true,
    },
  });

  // Return the raw token in this response only — never retrievable again
  return NextResponse.json({ token: rawToken, ...created }, { status: 201 });
}

// DELETE /api/internal/public-tokens/:id
// Revokes (deletes) a public token by its DB id.
export async function DELETE(req: NextRequest) {
  const authErr = requireInternalAuth(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Only allow deleting public tokens via this endpoint
  const existing = await prisma.apikey.findUnique({
    where: { id },
    select: { id: true, keyType: true },
  });
  if (!existing || existing.keyType !== "public") {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  await prisma.apikey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
