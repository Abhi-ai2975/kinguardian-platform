/**
 * POST /api/org/switch
 *
 * Proxies an org switch to the IAM internal endpoint. Called by the
 * OrgSwitcher client component — keeps the INTERNAL_API_SECRET server-only.
 *
 * @module
 */
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";

export async function POST(request: Request) {
  const { orgId } = await request.json();
  if (!orgId)
    return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const iamUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:5000";
  const hdrs = await headers();
  const jar = await cookies();
  const accessToken = jar.get("console.access_token")?.value;

  const res = await fetch(
    `${iamUrl}/api/internal/user-context/active-organization`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(hdrs.get("cookie") ? { cookie: hdrs.get("cookie")! } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(process.env.INTERNAL_API_SECRET
          ? { "x-internal-secret": process.env.INTERNAL_API_SECRET }
          : {}),
      },
      body: JSON.stringify({ orgId }),
    },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json(data);
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie);
  return response;
}
