/**
 * /api/clinical-extraction-agent — proxy to the Python clinical-extraction-agent.
 *
 * Takes the SOAP note from a completed consultation and returns structured
 * FHIR clinical resources: { service_requests, medication_requests,
 * observations, conditions }.
 *
 * Called from the doctor's post-consultation review ("Extract Clinical Data").
 * Results are saved via saveClinicalDataAction.
 *
 * Required env var:
 *   AGENT_CLINICAL_API_URL  — URL of the upstream Python agent
 *   BETTER_AUTH_URL         — used by getAuthToken to fetch a bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Proxies the SOAP note to the clinical-extraction-agent and returns
 * structured FHIR resources.
 *
 * @param req - POST body: { soap_note } or whatever the upstream agent expects.
 * @returns JSON { service_requests, medication_requests, observations, conditions }
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const body = await req.json();
    const agentUrl = process.env.AGENT_CLINICAL_API_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "AGENT_CLINICAL_API_URL is not configured" },
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
        { error: "Clinical extraction agent request failed" },
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
    console.error("[clinical-extraction-agent] proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
