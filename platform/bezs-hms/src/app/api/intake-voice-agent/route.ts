/**
 * Intake voice-agent token endpoint.
 *
 * Route: GET /api/intake-voice-agent
 *
 * Returns a short-lived JWT (via getAuthToken) and the resolved WebSocket URL
 * for the voice agent. Keeps INTAKE_VOICE_AGENT_URL server-only — the browser
 * only ever receives the ws(s):// form and a signed token.
 *
 * Response: { token: string; wsUrl: string }
 */

import { NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Converts an http(s):// URL to its ws(s):// equivalent and appends /audio.
 *
 * @param httpUrl - Base URL from INTAKE_VOICE_AGENT_URL env var.
 * @returns WebSocket endpoint URL with /audio path appended.
 */
function toWsUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  // Normalise: strip trailing slash then append /audio
  url.pathname = url.pathname.replace(/\/$/, "") + "/ws/audio";
  return url.toString();
}

/**
 * GET /api/intake-voice-agent
 *
 * Mints a short-lived JWT and resolves the WebSocket URL for the voice agent.
 *
 * @returns JSON { token, wsUrl } on success, or 500 if misconfigured.
 */
export async function GET() {
  try {
    const agentUrl = process.env.INTAKE_VOICE_AGENT_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "INTAKE_VOICE_AGENT_URL is not configured" },
        { status: 500 },
      );
    }

    const token = await getAuthToken();
    const wsUrl = toWsUrl(agentUrl);

    return NextResponse.json({ token, wsUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("Failed to fetch agent token") ||
      message.includes("JWT token not found")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[intake-voice-agent] token error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
