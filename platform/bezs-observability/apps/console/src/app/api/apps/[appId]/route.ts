// DELETE /api/apps/[appId] — proxy to IAM DELETE /api/apps/[appId]
import { NextRequest, NextResponse } from "next/server";
import { deleteApp } from "@/lib/apps";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const cookie = req.headers.get("cookie") ?? "";
  const { appId } = await params;

  await deleteApp(appId, cookie);
  return new NextResponse(null, { status: 204 });
}
