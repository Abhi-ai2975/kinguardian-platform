// GET    /api/dashboards/[id]
// PUT    /api/dashboards/[id]
// DELETE /api/dashboards/[id]
// Proxies to IAM /api/internal/dashboards/[id], forwarding the session cookie.
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const IAM_URL = process.env.IAM_URL ?? "http://localhost:5000";

async function iamHeaders() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";
  const auth   = hdrs.get("authorization") ?? "";
  return {
    "Content-Type": "application/json",
    ...(cookie ? { cookie } : {}),
    ...(auth   ? { authorization: auth } : {}),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${IAM_URL}/api/internal/dashboards/${id}`, {
    headers: await iamHeaders(),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(`${IAM_URL}/api/internal/dashboards/${id}`, {
    method: "PUT",
    headers: await iamHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${IAM_URL}/api/internal/dashboards/${id}`, {
    method: "DELETE",
    headers: await iamHeaders(),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
