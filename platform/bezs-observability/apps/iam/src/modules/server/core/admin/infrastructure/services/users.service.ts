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
