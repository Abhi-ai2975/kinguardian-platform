/**
 * Create a new user in the auth system.
 * All fields (name, email, password, role, optional username) are forwarded
 * directly to Better Auth via the service layer.
 *
 * @param payload - Validated user creation data with required name, email,
 *                  password, role, and optional username.
 * @returns The created user object (unwrapped from `res.user` by the service).
 * @layer Application
 */

import { TCreateUserValidationSchema, TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function createUserUseCase(payload: TCreateUserValidationSchema): Promise<TUserSchema> {
  const usersService = getInjection("IUsersService");
  return await usersService.createUser(payload);
}
