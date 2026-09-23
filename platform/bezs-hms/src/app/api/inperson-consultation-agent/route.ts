/**
 * In-person consultation diarization agent token endpoint.
 *
 * Route: GET /api/inperson-consultation-agent
 *
 * Returns a short-lived JWT (via getAuthToken) and the resolved WebSocket URL
 * for the in-person diarization agent. The agent streams live partial transcripts
 * during recording, then emits a final diarized transcript (Doctor / Patient
 * labeled) once silence is detected after the mic is stopped.
 *
 * Keeps INPERSON_CONSULTATION_AGENT_URL server-only — the browser only ever
 * receives the ws(s):// form and a signed token.
 *
 * Response: { token: string; wsUrl: string }
 */

import { NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Converts an http(s):// base URL to its ws(s):// WebSocket equivalent
 * and appends the /ws/diarize path used by the in-person diarization agent.
 *
 * @param httpUrl - Base URL from INPERSON_CONSULTATION_AGENT_URL env var.
 * @returns WebSocket endpoint URL with /ws/diarize path appended.
 */
function toWsUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  // Normalise trailing slash then append the diarization WS path
  url.pathname = url.pathname.replace(/\/$/, "") + "/ws/diarize";
  return url.toString();
}

/**
 * GET /api/inperson-consultation-agent
 *
 * Mints a short-lived JWT and resolves the WebSocket URL for the in-person
 * diarization agent. Called by InPersonConsultation before opening the WS.
 *
 * @returns JSON { token, wsUrl } on success, 401 if unauthenticated, 500 if misconfigured.
 */
export async function GET() {
  try {
    const agentUrl = process.env.INPERSON_CONSULTATION_AGENT_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "INPERSON_CONSULTATION_AGENT_URL is not configured" },
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
    console.error("[inperson-consultation-agent] token error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
