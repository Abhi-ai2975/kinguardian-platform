import { auth } from "../../../modules/server/auth-provider/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const configuration = await auth.api.getAgentConfiguration();
  return NextResponse.json(configuration);
}
