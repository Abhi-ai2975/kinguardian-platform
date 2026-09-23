/**
 * Assessment plan agent API proxy.
 *
 * Route: POST /api/assessment-plan-agent
 *
 * Forwards the completed intake conversation to ASSESSMENT_PLAN_AGENT_URL,
 * attaching a short-lived JWT via getAuthToken(). Returns the AI-generated
 * clinical report as JSON.
 *
 * Called once at the end of a text intake session before saving to the DB.
 *
 * Request body: { conversation: string[] }
 * Response: JSON clinical report.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Proxies the conversation transcript to the assessment agent and returns
 * the clinical report JSON.
 *
 * @param req - Incoming POST with { conversation }.
 * @returns JSON report from the assessment agent.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const body = await req.json();
    const agentUrl = process.env.ASSESSMENT_PLAN_AGENT_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "ASSESSMENT_PLAN_AGENT_URL is not configured" },
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

    const report = await upstream.json();
    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("Failed to fetch agent token") ||
      message.includes("JWT token not found")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[assessment-plan-agent] proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
