/**
 * POST /api/livekit-start-transcriber
 *
 * Layer: API route (server)
 *
 * Tells the Python LiveKit agent to attach a transcriber to the given room.
 * Called by TranscriptionPanel on mount, before subscribing to the SSE
 * transcript stream. Without this call the agent never starts transcribing
 * and the SSE stream remains silent.
 *
 * Forwards the request to the Python agent's /attach-transcriber endpoint.
 * Uses NEXT_PUBLIC_LIVEKIT_AGENT_URL (same env var used by TranscriptionPanel
 * for the SSE connection) so both always point to the same agent host.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Attach a transcriber to a LiveKit room.
 *
 * @param req - JSON body: { roomId: string }
 * @returns { success: true } on success, error JSON on failure.
 */
export async function POST(req: NextRequest) {
  const { roomId } = await req.json();

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  const agentUrl = process.env.NEXT_PUBLIC_LIVEKIT_AGENT_URL;

  if (!agentUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_LIVEKIT_AGENT_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${agentUrl}/attach-transcriber`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[livekit-start-transcriber] agent error:", body);
      return NextResponse.json({ error: "Failed to attach transcriber" }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[livekit-start-transcriber] fetch error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
