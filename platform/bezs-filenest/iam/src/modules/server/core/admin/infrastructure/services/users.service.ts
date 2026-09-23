/**
 * @module admin/users.service
 * @description Infrastructure service for admin user management operations.
 *              Every method calls Better Auth's admin API, validates the
 *              response with Zod, and logs start/success/error via Winston.
 * @category Infrastructure
 * @layer Infrastructure
 *
 * **Better Auth return type gotchas (critical):**
 * - `adminUpdateUser` returns the user **directly** (no `.user` wrapper)
 * - `createUser`, `setRole`, `banUser`, `unbanUser` return `{ user }` — use `.user`
 * - `removeUser` returns `void` — we build `{ success: true }` manually
 * - `setUserPassword` returns `{ status: boolean }` — NOT `{ success }`
 * - `impersonateUser` returns `{ session, user }` — both needed
 */

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { auth } from "@/modules/server/auth-provider/auth";
import { IUsersService } from "../../domain/interfaces/users.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import {
  GetUsersResponseDtoSchema,
  TGetUsersResponseDtoSchema,
  UserSchema,
  TUserSchema,
  TCreateUserValidationSchema,
  TUpdateUserValidationSchema,
  TSetUserRoleValidationSchema,
  TBanUserValidationSchema,
  TSetUserPasswordValidationSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";

export class UsersService implements IUsersService {
  /**
   * List all users in the system.
   * Calls `auth.api.listUsers({ query: {} })` — no pagination params,
   * returns everything at once.
   *
   * @returns A flat array of user objects (not paginated — we strip the wrapper in the controller).
   */
  async getUsers(): Promise<TGetUsersResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.getUsers",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await auth.api.listUsers({
        query: {},
        headers: await headers(),
      });
      const data = await GetUsersResponseDtoSchema.parseAsync(res);
      logOperation("success", {
        name: "UsersService.getUsers",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.getUsers",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to list users");
    }
  }

  /**
   * Find a user by email address.
   * Uses `listUsers` with `searchValue` + `searchField: "email"` + `limit: 1`.
   * Throws if no user matches the email.
   *
   * @param email - The email to search for (exact match).
   * @returns The user object.
   * @throws {Error} If no user is found with that email.
   */
  async getUserByEmail(email: string): Promise<TUserSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "UsersService.getUserByEmail",
      startTimeMs,
      context: { operationId, email },
    });

    try {
      const res = await auth.api.listUsers({
        query: { searchValue: email, searchField: "email", limit: 1 },
        headers: await headers(),
      });

      const user = res?.users?.[0];

      if (!user) throw new Error(`No user found with email: ${email}`);

      const data = await UserSchema.parseAsync(user);

      logOperation("success", {
        name: "UsersService.getUserByEmail",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.getUserByEmail",
        startTimeMs,
        err: error,
        context: { operationId, email },
      });

      throw mapBetterAuthError(error, `No user found with email: ${email}`);
    }
  }

  /**
   * Create a new user via Better Auth.
   * @returns The created user — unwrapped from `res.user`.
   */
  async createUser(payload: TCreateUserValidationSchema): Promise<TUserSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.createUser",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await auth.api.createUser({
        body: {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          role: payload.role,
          ...(payload.username ? { username: payload.username } : {}),
        },
        headers: await headers(),
      });
      const data = await UserSchema.parseAsync(res.user);
      logOperation("success", {
        name: "UsersService.createUser",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.createUser",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to create user");
    }
  }

  /**
   * Update a user's name, email, or image.
   * ⚠️ **Gotcha:** `adminUpdateUser` returns the user **directly** —
   *     no `.user` wrapper. Do NOT try `res.user`.
   *
   * @returns The updated user object (direct return, not wrapped).
   */
  async updateUser(payload: TUpdateUserValidationSchema): Promise<TUserSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.updateUser",
      startTimeMs,
      userId: payload.userId,
      context: { operationId },
    });
    try {
      const res = await auth.api.adminUpdateUser({
        body: { userId: payload.userId, data: payload.data },
        headers: await headers(),
      });
      const data = await UserSchema.parseAsync(res);
      logOperation("success", {
        name: "UsersService.updateUser",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.updateUser",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to update user");
    }
  }

  /**
   * Set a user's RBAC role (superadmin, admin, or guest).
   * Calls `auth.api.setRole` — returns `{ user }` wrapper.
   *
   * @param payload - `{ userId, role }` where `role` is one of the configured admin roles.
   * @returns The user object with updated role, unwrapped from `res.user`.
   */
  async setUserRole(
    payload: TSetUserRoleValidationSchema,
  ): Promise<TUserSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.setUserRole",
      startTimeMs,
      userId: payload.userId,
      context: { operationId },
    });
    try {
      const res = await auth.api.setRole({
        body: { userId: payload.userId, role: payload.role },
        headers: await headers(),
      });
      const data = await UserSchema.parseAsync(res.user);
      logOperation("success", {
        name: "UsersService.setUserRole",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.setUserRole",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to set user role");
    }
  }

  /**
   * Ban a user — blocks their sign-in until unbanned or ban expires.
   * Supports optional `banReason` and `banExpiresIn` (seconds).
   *
   * @param payload - `{ userId, banReason?, banExpiresIn? }`
   * @returns The banned user object, unwrapped from `res.user`.
   */
  async banUser(payload: TBanUserValidationSchema): Promise<TUserSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.banUser",
      startTimeMs,
      userId: payload.userId,
      context: { operationId },
    });
    try {
      const res = await auth.api.banUser({
        body: {
          userId: payload.userId,
          banReason: payload.banReason,
          banExpiresIn: payload.banExpiresIn,
        },
        headers: await headers(),
      });
      const data = await UserSchema.parseAsync(res.user);
      logOperation("success", {
        name: "UsersService.banUser",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.banUser",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to ban user");
    }
  }

  /**
   * Unban a previously banned user — restores their ability to sign in.
   * Calls `auth.api.unbanUser` — returns `{ user }` wrapper.
   *
   * @returns The unbanned user object, unwrapped from `res.user`.
   */
  async unbanUser(payload: { userId: string }): Promise<TUserSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.unbanUser",
      startTimeMs,
      userId: payload.userId,
      context: { operationId },
    });
    try {
      const res = await auth.api.unbanUser({
        body: { userId: payload.userId },
        headers: await headers(),
      });
      const data = await UserSchema.parseAsync(res.user);
      logOperation("success", {
        name: "UsersService.unbanUser",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.unbanUser",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to unban user");
    }
  }

  /**
   * Permanently delete a user.
   * ⚠️ **Gotcha:** `removeUser` returns `void` — we construct `{ success: true }` manually.
   *
   * @returns `{ success: true }` — built from `res.success`.
   */
  async removeUser(payload: { userId: string }): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.removeUser",
      startTimeMs,
      userId: payload.userId,
      context: { operationId },
    });
    try {
      const res = await auth.api.removeUser({
        body: { userId: payload.userId },
        headers: await headers(),
      });
      const data = { success: res.success };
      logOperation("success", {
        name: "UsersService.removeUser",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.removeUser",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to remove user");
    }
  }

  /**
   * Set a user's password (admin override — no old password required).
   * ⚠️ **Gotcha:** Returns `{ status: boolean }`, NOT `{ success: boolean }`.
   *
   * @returns `{ status: true }` on success.
   */
  async setUserPassword(
    payload: TSetUserPasswordValidationSchema,
  ): Promise<{ status: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.setUserPassword",
      startTimeMs,
      userId: payload.userId,
      context: { operationId },
    });
    try {
      const res = await auth.api.setUserPassword({
        body: { userId: payload.userId, newPassword: payload.newPassword },
        headers: await headers(),
      });
      const data = { status: res.status };
      logOperation("success", {
        name: "UsersService.setUserPassword",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.setUserPassword",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to set user password");
    }
  }

  /**
   * Revoke all active sessions for a user — forces sign-out on all devices.
   * @returns `{ success: true }`.
   */
  async revokeUserSessions(payload: {
    userId: string;
  }): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.revokeUserSessions",
      startTimeMs,
      userId: payload.userId,
      context: { operationId },
    });
    try {
      const res = await auth.api.revokeUserSessions({
        body: { userId: payload.userId },
        headers: await headers(),
      });
      const data = { success: res.success };
      logOperation("success", {
        name: "UsersService.revokeUserSessions",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.revokeUserSessions",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to revoke user sessions");
    }
  }

  /**
   * Impersonate a user — creates a new session for the admin as the target user.
   * Returns both the new `session` and `user` objects so the controller can
   * propagate the session cookie and trigger a redirect.
   *
   * ⚠️ **WARNING:** This is a powerful operation. Only superadmins should have access.
   *
   * @returns `{ session: unknown, user: TUserSchema }` — session must be passed to the client.
   */
  async impersonateUser(payload: {
    userId: string;
  }): Promise<{ session: unknown; user: TUserSchema }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "UsersService.impersonateUser",
      startTimeMs,
      userId: payload.userId,
      context: { operationId },
    });
    try {
      const res = await auth.api.impersonateUser({
        body: { userId: payload.userId },
        headers: await headers(),
      });
      const user = await UserSchema.parseAsync(res.user);
      const data = { session: res.session, user };
      logOperation("success", {
        name: "UsersService.impersonateUser",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "UsersService.impersonateUser",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to impersonate user");
    }
  }
}
