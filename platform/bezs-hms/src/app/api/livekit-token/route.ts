/**
 * /api/livekit-token — generates a LiveKit JWT for a participant to join a room.
 *
 * POST { roomId: string, name: string }
 * Returns { token: string, identity: string }
 *
 * LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in environment variables.
 * The identity is derived from the display name to keep it human-readable in logs.
 */

import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Generates a short-lived LiveKit access token for a named participant.
 *
 * @param req - POST body: { roomId, name }
 * @returns JSON { token, identity } or an error response.
 */
export async function POST(req: NextRequest) {
  const { roomId, name } = await req.json();

  if (!roomId || !name) {
    return NextResponse.json({ error: "Missing roomId or name" }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Server misconfigured: missing LiveKit credentials" }, { status: 500 });
  }

  // Build a URL-safe identity from the display name to avoid LiveKit parsing issues
  const identity = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.random().toString(36).substring(7)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({ displayName: name }),
  });

  at.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token, identity });
}
