/**
 * Intake agent API proxy.
 *
 * Route: POST /api/intake-agent
 *
 * Forwards the request body directly to INTAKE_AGENT_URL, attaching a
 * short-lived JWT obtained via getAuthToken(). Streams the response back.
 * session_id is optional — omit on the first turn and the agent creates one,
 * returning it via X-Session-Id which is forwarded to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Proxies a chat message to the external intake agent and streams the response.
 *
 * @param req - Incoming POST with { message: string; session_id?: string }.
 * @returns Streamed response from the intake agent.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const body = await req.json();
    const agentUrl = process.env.INTAKE_AGENT_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "INTAKE_AGENT_URL is not configured" },
        { status: 500 },
      );
    }

    const upstream = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Agent request failed" },
        { status: upstream.status },
      );
    }

    if (!upstream.body) {
      return NextResponse.json({ error: "No response body" }, { status: 500 });
    }

    const responseHeaders: HeadersInit = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    };

    // Forward the session id so the client can reuse it on subsequent turns
    const sessionId = upstream.headers.get("X-Session-Id");
    if (sessionId) {
      (responseHeaders as Record<string, string>)["X-Session-Id"] = sessionId;
    }

    return new NextResponse(upstream.body, { headers: responseHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("Failed to fetch agent token") ||
      message.includes("JWT token not found")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[intake-agent] proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
