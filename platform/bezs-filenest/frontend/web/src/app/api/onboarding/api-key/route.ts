/**
 * POST /api/onboarding/api-key
 *
 * Server-side proxy for API key creation during onboarding. Keeps DEFAULT_SCOPES
 * server-only so the client cannot tamper with the granted permissions.
 *
 * Accepts { orgId, projectId } from the client. Forwards the session cookie to
 * the IAM so BetterAuth recognises the authenticated user.
 *
 * Returns { key: string } on success.
 *
 * @module
 */

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

const DEFAULT_SCOPES = [
  "files:upload",
  "files:download",
  "files:read",
  "files:delete",
  "files:metadata",
  "folders:read",
  "folders:write",
  "upload_tokens:create",
  "webhooks:read",
  "webhooks:write",
  "projects:read",
  "projects:update",
  "audit:read",
];

export async function POST(request: Request) {
  const { orgId, projectId } = await request.json();

  if (!orgId?.trim()) {
    return NextResponse.json({ error: "orgId is required." }, { status: 400 });
  }

  const iamUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:5000";
  const origin = process.env.APP_URL ?? "http://localhost:3000";

  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("console.access_token")?.value;

  const authHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: origin,
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const res = await fetch(`${iamUrl}/api/auth/api-key/create`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "default",
      organizationId: orgId,
      metadata: {
        organizationId: orgId,
        projectId: projectId || null,
        scopes: DEFAULT_SCOPES,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.message ?? "Failed to generate API key." },
      { status: res.status },
    );
  }

  return NextResponse.json({ key: (data as { key: string }).key });
}
