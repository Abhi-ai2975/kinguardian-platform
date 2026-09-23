// POST /api/apps/unlink-key — remove the app association from an API key (sets app_id to NULL).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../prisma/db";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const keyId = typeof body?.keyId === "string" ? body.keyId : null;
  if (!keyId) return NextResponse.json({ error: "keyId is required" }, { status: 400 });

  await prisma.apikey.update({
    where: { id: keyId },
    data: { appId: null },
  });

  return NextResponse.json({ ok: true });
}
