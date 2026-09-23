/**
 * @module shared/auth/require-role
 * @description Server-side role gate for admin pages.
 *              Called at the top of every `/admin/*` page component.
 *              Checks the session user's role against a whitelist.
 *              Redirects unauthenticated users to `/auth/sign-in`
 *              and unauthorized users to `/`.
 *
 * **Usage in page components:**
 * ```ts
 * await requireRole(["superadmin"]);
 * ```
 *
 * @param roles - Array of allowed role strings (e.g. `["superadmin"]`).
 * @returns The session object if the user is authorized.
 * @throws Redirect — never throws, always redirects on failure.
 * @category Auth Guard
 */

import { redirect } from "@/i18n/navigation";
import { getServerSession } from "../../auth-provider/auth-server";
import { getLocale } from "next-intl/server";

export async function requireRole(roles: string[]) {
  const [session, locale] = await Promise.all([
    getServerSession(),
    getLocale(),
  ]);

  if (!session?.user) {
    redirect({ href: "/auth/sign-in", locale });
  }

  const userRole = (session.user as { role?: string | null }).role;

  if (!userRole || !roles.includes(userRole)) {
    redirect({ href: "/", locale });
  }

  return session;
}
