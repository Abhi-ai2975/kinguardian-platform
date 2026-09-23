// GET /api/apps/[appId]/keys  — proxy to IAM (list keys linked to app)
// POST /api/apps/[appId]/keys — proxy to IAM (link a key to app)
import { NextRequest, NextResponse } from "next/server";
import { listAppKeys, linkKey } from "@/lib/apps";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const cookie = req.headers.get("cookie") ?? "";
  const { appId } = await params;

  const keys = await listAppKeys(appId, cookie);
  return NextResponse.json(keys);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const cookie = req.headers.get("cookie") ?? "";
  const { appId } = await params;

  const body = await req.json().catch(() => null);
  const keyId: string = body?.keyId ?? "";
  if (!keyId) return NextResponse.json({ error: "keyId is required" }, { status: 400 });

  await linkKey(appId, keyId, cookie);
  return NextResponse.json({ ok: true });
}
