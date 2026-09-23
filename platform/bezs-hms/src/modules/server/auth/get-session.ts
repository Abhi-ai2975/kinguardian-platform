import { headers } from "next/headers";
import { AuthResponse } from "./types";

export async function getServerSession(): Promise<AuthResponse | null> {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") || "";

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth/get-session`,
    {
      headers: { cookie },
      cache: "no-store",
    },
  );

  if (!res.ok) return null;

  return res.json();
}
