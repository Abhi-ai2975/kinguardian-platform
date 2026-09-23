import { NextRequest, NextResponse } from "next/server";
import { getOAuthClientOrigins } from "@/modules/server/auth-provider/oauth-client-origins";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function GET(req: NextRequest) {
  if (INTERNAL_SECRET) {
    const auth = req.headers.get("x-internal-secret");
    if (auth !== INTERNAL_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const origins = await getOAuthClientOrigins();
  return NextResponse.json({ origins });
}
