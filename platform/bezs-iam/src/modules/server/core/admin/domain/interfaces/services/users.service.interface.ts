import {
  TGetUsersResponseDtoSchema,
  TUserSchema,
  TCreateUserValidationSchema,
  TSetUserRoleValidationSchema,
  TBanUserValidationSchema,
  TSetUserPasswordValidationSchema,
  TUpdateUserValidationSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";

export interface IUsersService {
  getUsers(): Promise<TGetUsersResponseDtoSchema>;
  getUserByEmail(email: string): Promise<TUserSchema>;
  createUser(payload: TCreateUserValidationSchema): Promise<TUserSchema>;
  updateUser(payload: TUpdateUserValidationSchema): Promise<TUserSchema>;
  setUserRole(payload: TSetUserRoleValidationSchema): Promise<TUserSchema>;
  banUser(payload: TBanUserValidationSchema): Promise<TUserSchema>;
  unbanUser(payload: { userId: string }): Promise<TUserSchema>;
  removeUser(payload: { userId: string }): Promise<{ success: boolean }>;
  setUserPassword(payload: TSetUserPasswordValidationSchema): Promise<{ status: boolean }>;
  revokeUserSessions(payload: { userId: string }): Promise<{ success: boolean }>;
  impersonateUser(payload: { userId: string }): Promise<{ session: unknown; user: TUserSchema }>;
}
