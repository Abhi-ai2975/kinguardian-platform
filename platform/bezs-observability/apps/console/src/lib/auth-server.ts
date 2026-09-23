// auth-server.ts — server-side session helper for the console.
//
// Supports two auth mechanisms:
//   1. Cookie-based session (better-auth.session_token) — set when using the
//      /api/auth/* proxy for direct IAM operations.
//   2. OAuth access_token (console.access_token) — set by /api/auth/token
//      after the PKCE flow. Used as a Bearer token against IAM's userinfo
//      endpoint to reconstruct an equivalent session object.
import { headers, cookies } from "next/headers";
import { cache } from "react";

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};

export type ConsoleUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
};

export type ConsoleSession = {
  id: string;
  token: string;
  expiresAt: string;
  userId: string;
  activeOrganizationId: string | null;
  organizations: OrgSummary[];
  permissions: string[];
};

export type AuthResponse = {
  user: ConsoleUser;
  session: ConsoleSession;
};

const iamUrl = () => process.env.IAM_URL ?? "http://localhost:5000";

// getServerSession returns the authenticated user+session or null.
// React cache() de-duplicates calls within one render pass so multiple
// layouts/pages sharing the same request hit IAM only once.
export const getServerSession = cache(async (): Promise<AuthResponse | null> => {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";

  // ── 1. Cookie-based session (legacy + email/password flow) ────────────────
  try {
    const res = await fetch(`${iamUrl()}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.user) return data as AuthResponse;
    }
  } catch {}

  // ── 2. OAuth access_token (PKCE flow) ────────────────────────────────────
  // The token route stores the access_token as console.access_token after a
  // successful code exchange. We use it as a Bearer token against IAM's
  // userinfo endpoint which includes org/permission claims via customUserInfoClaims.
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("console.access_token")?.value;

  if (!accessToken) return null;

  try {
    const infoRes = await fetch(`${iamUrl()}/api/auth/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!infoRes.ok) return null;

    const info = await infoRes.json();
    if (!info?.sub) return null;

    return {
      user: {
        id: info.sub,
        name: info.name ?? "",
        email: info.email ?? "",
        emailVerified: info.email_verified ?? false,
        image: info.picture ?? null,
        role: info.role ?? "user",
      },
      session: {
        id: "oauth",
        token: accessToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        userId: info.sub,
        activeOrganizationId: info.activeOrganizationId ?? null,
        organizations: (info.organizations as OrgSummary[]) ?? [],
        permissions: (info.permissions as string[]) ?? [],
      },
    };
  } catch {
    return null;
  }
});
