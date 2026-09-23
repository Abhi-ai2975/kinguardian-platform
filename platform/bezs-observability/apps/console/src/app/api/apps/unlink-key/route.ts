// POST /api/apps/unlink-key — proxy to IAM (sets apikey.app_id = NULL)
import { NextRequest, NextResponse } from "next/server";
import { unlinkKey } from "@/lib/apps";

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const body = await req.json().catch(() => null);
  const keyId: string = body?.keyId ?? "";

  if (!keyId) return NextResponse.json({ error: "keyId is required" }, { status: 400 });

  await unlinkKey(keyId, cookie);
  return NextResponse.json({ ok: true });
}
