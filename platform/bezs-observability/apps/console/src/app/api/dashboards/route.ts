// GET  /api/dashboards?orgId=xxx  — list dashboards
// POST /api/dashboards            — create dashboard
// Proxies to IAM /api/internal/dashboards, forwarding the session cookie.
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const IAM_URL = process.env.IAM_URL ?? "http://localhost:5000";

async function iamHeaders() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";
  const auth = hdrs.get("authorization") ?? "";
  return {
    "Content-Type": "application/json",
    ...(cookie ? { cookie } : {}),
    ...(auth   ? { authorization: auth } : {}),
  };
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  const res = await fetch(
    `${IAM_URL}/api/internal/dashboards?orgId=${encodeURIComponent(orgId ?? "")}`,
    { headers: await iamHeaders() },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${IAM_URL}/api/internal/dashboards`, {
    method: "POST",
    headers: await iamHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
