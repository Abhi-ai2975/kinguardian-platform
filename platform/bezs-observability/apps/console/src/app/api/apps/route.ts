// GET /api/apps — proxy to IAM GET /api/apps (list apps for the authenticated org)
// POST /api/apps — proxy to IAM POST /api/apps (create a new application)
import { NextRequest, NextResponse } from "next/server";
import { listApps, createApp } from "@/lib/apps";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  try {
    const apps = await listApps(cookie);
    return NextResponse.json(apps);
  } catch (err) {
    console.error("[/api/apps GET]", err);
    return NextResponse.json({ error: "Failed to load apps" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const body = await req.json().catch(() => null);
  const name: string = body?.name?.trim() ?? "";

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  try {
    const app = await createApp(name, cookie);
    return NextResponse.json(app, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && (err as Error & { status?: number }).status === 409) {
      return NextResponse.json({ error: "An app with that name already exists" }, { status: 409 });
    }
    console.error("[/api/apps POST]", err);
    return NextResponse.json({ error: "Failed to create app" }, { status: 500 });
  }
}
