import { headers } from "next/headers";

export async function getAuthToken(): Promise<string> {
  const hdrs = await headers();
  // Only forward the session cookie — forwarding all browser headers causes
  // undici to fail with "fetch failed" due to forbidden headers (connection,
  // content-length, etc.) being present in the incoming request.
  const cookie = hdrs.get("cookie") ?? "";

  const res = await fetch(`${process.env.BETTER_AUTH_URL}/api/auth/token`, {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch agent token: ${res.status}`);
  }

  const data = await res.json();
  const token: string | undefined = data.token ?? data.jwt ?? data.access_token;

  if (!token) {
    throw new Error("Agent token not found in auth response");
  }

  return token;
}
