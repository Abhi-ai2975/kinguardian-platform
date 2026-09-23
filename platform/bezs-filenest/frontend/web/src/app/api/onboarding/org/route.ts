/**
 * POST /api/onboarding/org
 *
 * Creates an organisation in the IAM and sets it as the active org for the
 * current session. Called by the onboarding create-org page.
 *
 * Forwards the browser cookie header to the IAM so Better Auth recognises
 * the authenticated user. Also accepts an OAuth access_token cookie as a
 * Bearer header for PKCE-flow sessions.
 *
 * Returns { orgId: string } on success.
 *
 * @module
 */

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export async function POST(request: Request) {
  const { name, slug } = await request.json();

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json(
      { error: "name and slug are required." },
      { status: 400 },
    );
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

  // Step 1: create the organisation via Better Auth.
  const createRes = await fetch(`${iamUrl}/api/auth/organization/create`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    return NextResponse.json(
      {
        error:
          createData.message ??
          createData.error ??
          "Failed to create organisation.",
      },
      { status: createRes.status },
    );
  }

  const orgId: string = createData.id;

  // Step 2: activate the org so the session carries the new activeOrganizationId.
  // Endpoint: PATCH /api/internal/user-context/active-organization
  // Protected by x-internal-secret so only trusted server-side callers can use it.
  const setActiveRes = await fetch(
    `${iamUrl}/api/internal/user-context/active-organization`,
    {
      method: "PATCH",
      headers: {
        ...authHeaders,
        ...(process.env.INTERNAL_API_SECRET
          ? { "x-internal-secret": process.env.INTERNAL_API_SECRET }
          : {}),
      },
      body: JSON.stringify({ orgId }),
    },
  );

  if (!setActiveRes.ok) {
    const errData = await setActiveRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        error:
          errData.message ??
          errData.error ??
          "Organisation created but failed to activate it.",
      },
      { status: setActiveRes.status },
    );
  }

  // Forward Set-Cookie from the IAM so the browser session reflects the new org.
  const response = NextResponse.json({ orgId });
  const setCookie = setActiveRes.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }
  return response;
}
