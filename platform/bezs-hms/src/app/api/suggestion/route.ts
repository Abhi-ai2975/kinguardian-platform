/**
 * /api/suggestion — proxy to the doctor-assistant AI agent.
 *
 * Called by the Suggestion component during a live consultation.
 * Forwards { conversation: string[] } to DOCTOR_ASSISTANT_AGENT_URL and
 * returns { questions: string[] } from the upstream agent.
 *
 * Required env vars:
 *   DOCTOR_ASSISTANT_AGENT_URL  — upstream Python doctor-assistant agent
 *   BETTER_AUTH_URL             — used by getAuthToken to obtain a bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Proxies the conversation to the doctor-assistant agent and returns suggested questions.
 *
 * @param req - POST body: { conversation: string[] }
 * @returns JSON { questions: string[] } from the upstream agent.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const body = await req.json();

    const agentUrl = process.env.DOCTOR_ASSISTANT_AGENT_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "DOCTOR_ASSISTANT_AGENT_URL is not configured" },
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

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Failed to fetch agent token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[suggestion] proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
