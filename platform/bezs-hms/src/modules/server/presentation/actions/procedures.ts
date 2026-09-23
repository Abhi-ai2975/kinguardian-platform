/**
 * ZSA server action procedures.
 *
 * Layer: presentation / actions
 *
 * Exports reusable procedure factories that handle session resolution and
 * role enforcement for all server actions. Every action must pick the most
 * restrictive applicable procedure so authorization is enforced at the
 * procedure layer — not scattered across individual action handlers.
 *
 * Role strings are never hardcoded here — they are resolved via the ROLES
 * map in server/shared/auth/roles.ts. To change which raw roles qualify as
 * "telemedicine-admin", update that file only.
 *
 * Procedures available:
 *  - authenticatedProcedure — valid session required, any role
 *  - adminProcedure         — valid session + role in ROLES["telemedicine-admin"]
 */

"server-only";

import { createServerActionProcedure } from "zsa";
import { ZSAError } from "zsa";
import { getServerSession } from "@/modules/server/auth/get-session";
import { ROLES } from "@/modules/server/shared/auth/roles";

/**
 * Requires any valid authenticated session.
 * Use for actions any signed-in user can perform.
 *
 * @throws ZSAError("NOT_AUTHORIZED") if no session exists.
 */
export const authenticatedProcedure = createServerActionProcedure().handler(
  async () => {
    const session = await getServerSession();
    if (!session?.user) {
      throw new ZSAError("NOT_AUTHORIZED", "You must be signed in.");
    }
    return { session };
  },
);

/**
 * Requires a valid session where the user's active role is in the
 * "telemedicine-admin" permission group (defined in roles.ts).
 *
 * Use for all admin-area actions — organization management, user management, etc.
 *
 * @throws ZSAError("NOT_AUTHORIZED") if no session exists.
 * @throws ZSAError("FORBIDDEN") if the user's active role is not in the admin group.
 */
export const adminProcedure = createServerActionProcedure(
  authenticatedProcedure,
).handler(async ({ ctx }) => {
  const session = ctx.session;
  const allowed = ROLES["telemedicine-admin"] as readonly string[];
  if (!allowed.includes(session.session.activeRole)) {
    throw new ZSAError(
      "FORBIDDEN",
      "You must have an admin role to perform this action.",
    );
  }
  return { session };
});
