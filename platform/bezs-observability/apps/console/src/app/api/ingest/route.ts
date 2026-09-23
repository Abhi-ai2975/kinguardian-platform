// Proxy route for the onboarding test-event page.
// The browser cannot call the gateway directly (cross-origin), so this route
// forwards the request server-side, passing the Authorization header through
// so the gateway validates the user's own API key.
import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8080";

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  try {
    const body = await req.text();
    const res = await fetch(`${GATEWAY_URL}/v1/logs`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach gateway" }, { status: 502 });
  }
}
