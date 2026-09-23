/**
 * require-role — server-side route-level role guard for layout components.
 *
 * Layer: server / shared / auth
 *
 * Usage: call requireRole(session, "telemedicine-admin") at the top of an admin
 * layout after session resolution. Redirects to /unauthorized when the user's
 * active organization role is not in the requested permission group.
 *
 * This is the route-layer complement to adminProcedure (which guards server
 * actions). Together they form a two-layer role defense:
 *  1. requireRole    — blocks page/layout render for unauthorized users
 *  2. adminProcedure — blocks server action calls for unauthorized users
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { AuthResponse } from "@/modules/server/auth/types";
import { ROLES, RoleGroup } from "./roles";

/**
 * Asserts that the session's active role is in the given permission group.
 * Redirects to /unauthorized if the check fails.
 *
 * Must be called from a Server Component (layout, page, or async RSC).
 * Pass the already-resolved session — do not call getServerSession() again
 * here to avoid a duplicate HTTP round-trip.
 *
 * @param session   - The resolved session from getServerSession(). Must be non-null.
 * @param roleGroup - A key from ROLES (e.g. "telemedicine-admin").
 */
export async function requireRole(
  session: AuthResponse,
  roleGroup: RoleGroup
): Promise<void> {
  const allowed = ROLES[roleGroup] as readonly string[];
  if (!allowed.includes(session.session.activeRole)) {
    const locale = await getLocale();
    redirect({ href: "/unauthorized", locale });
  }
}
