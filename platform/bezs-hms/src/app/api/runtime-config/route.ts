/**
 * /api/runtime-config — exposes safe public env vars to client components.
 *
 * Client components cannot read server-only env vars at runtime; this route
 * bridges the gap for values like NEXT_PUBLIC_LIVEKIT_URL that are needed
 * in LiveKit client initialisation but must be fetched dynamically.
 *
 * GET → { livekitUrl: string }
 */

import { NextResponse } from "next/server";

/** Prevents this response from being cached at build time. */
export const dynamic = "force-dynamic";

/**
 * Returns runtime configuration consumed by client-side consultation components.
 *
 * @returns JSON object with public config values.
 */
export async function GET() {
  return NextResponse.json({
    livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  });
}
