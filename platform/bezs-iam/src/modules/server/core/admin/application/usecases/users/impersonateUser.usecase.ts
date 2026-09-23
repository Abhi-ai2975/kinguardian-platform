/**
 * Impersonate a target user — creates a new session cookie for the admin
 * as if they were the target user.
 *
 * ⚠️ **Critical:** Only superadmins should have access. The controller returns
 * both the new session (to set a cookie) and the user record. The action layer
 * must use `shouldRedirect: true` so the browser picks up the new session cookie.
 *
 * @param payload - `{ userId }` — the user to impersonate.
 * @returns `{ session, user }` — session for cookie propagation, user for display.
 * @layer Application
 */

import { TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function impersonateUserUseCase(payload: {
  userId: string;
}): Promise<{ session: unknown; user: TUserSchema }> {
  const usersService = getInjection("IUsersService");
  return await usersService.impersonateUser(payload);
}
