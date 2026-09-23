/**
 * /api/full-report-agent — proxy that calls the assessment-plan-agent and
 * doctor-report-agent in parallel, then merges their outputs.
 *
 * Called by DoctorConsult on end-call to generate the full consultation report.
 * Returns { soap_report, assessment_plan, generated_at }.
 *
 * Required env vars:
 *   ASSESSMENT_PLAN_AGENT_URL   — upstream assessment-plan Python agent
 *   DOCTOR_REPORT_AGENT_URL     — upstream doctor-report Python agent
 *   BETTER_AUTH_URL             — used by getAuthToken to fetch a bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Calls both AI agents in parallel and returns the merged report.
 *
 * @param req - POST body forwarded unchanged to both upstream agents.
 * @returns JSON { soap_report, assessment_plan, generated_at }
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const body = await req.json();

    const assessmentPlanUrl = process.env.ASSESSMENT_PLAN_AGENT_URL;
    const doctorReportUrl = process.env.DOCTOR_REPORT_AGENT_URL;

    if (!assessmentPlanUrl || !doctorReportUrl) {
      return NextResponse.json(
        { error: "ASSESSMENT_PLAN_AGENT_URL or DOCTOR_REPORT_AGENT_URL is not configured" },
        { status: 500 },
      );
    }

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    };

    const [assessmentRes, doctorRes] = await Promise.all([
      fetch(assessmentPlanUrl, fetchOptions),
      fetch(doctorReportUrl, fetchOptions),
    ]);

    if (!assessmentRes.ok || !doctorRes.ok) {
      const failedUrl = !assessmentRes.ok ? "assessment-plan" : "doctor-report";
      const status = !assessmentRes.ok ? assessmentRes.status : doctorRes.status;
      return NextResponse.json({ error: `${failedUrl} agent request failed` }, { status });
    }

    const [assessmentData, doctorData] = await Promise.all([
      assessmentRes.json(),
      doctorRes.json(),
    ]);

    // Unwrap { status, data } envelopes if present
    const assessmentPlan = assessmentData?.data ?? assessmentData;
    const soapReport = doctorData?.data ?? doctorData;

    return NextResponse.json({
      soap_report: soapReport,
      assessment_plan: assessmentPlan,
      generated_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Failed to fetch agent token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[full-report-agent] proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
