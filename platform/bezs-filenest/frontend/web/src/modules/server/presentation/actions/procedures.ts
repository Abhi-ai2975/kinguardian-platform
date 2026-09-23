/**
 * server/presentation/actions/procedures — ZSA procedure factories.
 *
 * Every server action picks the most restrictive procedure applicable so
 * auth is enforced at the procedure layer, not scattered across handlers.
 *
 * Procedures:
 *  - authenticatedProcedure — any valid session required
 *
 * @module
 */
"server-only";

import { createServerActionProcedure, ZSAError } from "zsa";
import { getServerSession } from "@/modules/server/auth/get-session";

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
