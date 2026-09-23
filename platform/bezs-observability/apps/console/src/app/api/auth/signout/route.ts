// POST /api/auth/signout — clears the OAuth access_token cookie.
// Called alongside authClient.signOut() so both the better-auth session
// cookie (cleared by IAM via the proxy) and our OAuth cookie are removed.
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("console.access_token");
  return response;
}
