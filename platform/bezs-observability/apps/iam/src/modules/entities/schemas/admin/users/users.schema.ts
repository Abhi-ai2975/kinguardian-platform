import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ---------------------------------------------------------- //
// Base schemas
// ---------------------------------------------------------- //

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  username: z.string().nullable().optional(),
  displayUsername: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  banned: z.boolean().nullable().optional(),
  banReason: z.string().nullable().optional(),
  banExpires: z.coerce.date().nullable().optional(),
  twoFactorEnabled: z.boolean().nullable().optional(),
});

export const UserSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  impersonatedBy: z.string().nullable().optional(),
});

export const GetUsersResponseDtoSchema = z.object({
  users: z.array(UserSchema),
  total: z.number(),
  limit: z.number().nullable().optional(),
  offset: z.number().nullable().optional(),
});

export type TUserSchema = z.infer<typeof UserSchema>;
export type TUserSessionSchema = z.infer<typeof UserSessionSchema>;
export type TGetUsersResponseDtoSchema = z.infer<typeof GetUsersResponseDtoSchema>;

// ---------------------------------------------------------- //
// Create User
// ---------------------------------------------------------- //

export const CreateUserFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, _ and - only")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["guest", "admin", "superadmin"]).default("guest"),
});

export const CreateUserValidationSchema = CreateUserFormSchema;

export const CreateUserActionSchema = z.object({
  payload: CreateUserValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TCreateUserFormSchema = z.infer<typeof CreateUserFormSchema>;
export type TCreateUserValidationSchema = z.infer<typeof CreateUserValidationSchema>;
export type TCreateUserActionSchema = z.infer<typeof CreateUserActionSchema>;

// ---------------------------------------------------------- //
// Set User Role
// ---------------------------------------------------------- //

export const SetUserRoleFormSchema = z.object({
  role: z.enum(["guest", "admin", "superadmin"]),
});

export const SetUserRoleValidationSchema = z.object({
  userId: z.string(),
  role: z.enum(["guest", "admin", "superadmin"]),
});

export const SetUserRoleActionSchema = z.object({
  payload: SetUserRoleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TSetUserRoleFormSchema = z.infer<typeof SetUserRoleFormSchema>;
export type TSetUserRoleValidationSchema = z.infer<typeof SetUserRoleValidationSchema>;
export type TSetUserRoleActionSchema = z.infer<typeof SetUserRoleActionSchema>;

// ---------------------------------------------------------- //
// Ban User
// ---------------------------------------------------------- //

export const BanUserFormSchema = z.object({
  banReason: z.string().optional(),
  // 0 = permanent ban, >0 = expires in N days
  banExpiresInDays: z.coerce.number().min(0).default(0),
});

export const BanUserValidationSchema = z.object({
  userId: z.string(),
  banReason: z.string().optional(),
  banExpiresIn: z.number().optional(), // in seconds
});

export const BanUserActionSchema = z.object({
  payload: BanUserValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TBanUserFormSchema = z.infer<typeof BanUserFormSchema>;
export type TBanUserValidationSchema = z.infer<typeof BanUserValidationSchema>;
export type TBanUserActionSchema = z.infer<typeof BanUserActionSchema>;

// ---------------------------------------------------------- //
// Unban User
// ---------------------------------------------------------- //

export const UnbanUserValidationSchema = z.object({ userId: z.string() });

export const UnbanUserActionSchema = z.object({
  payload: UnbanUserValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TUnbanUserValidationSchema = z.infer<typeof UnbanUserValidationSchema>;
export type TUnbanUserActionSchema = z.infer<typeof UnbanUserActionSchema>;

// ---------------------------------------------------------- //
// Remove User
// ---------------------------------------------------------- //

export const RemoveUserValidationSchema = z.object({ userId: z.string() });

export const RemoveUserActionSchema = z.object({
  payload: RemoveUserValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TRemoveUserValidationSchema = z.infer<typeof RemoveUserValidationSchema>;
export type TRemoveUserActionSchema = z.infer<typeof RemoveUserActionSchema>;

// ---------------------------------------------------------- //
// Set User Password
// ---------------------------------------------------------- //

export const SetUserPasswordFormSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const SetUserPasswordValidationSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(8),
});

export const SetUserPasswordActionSchema = z.object({
  payload: SetUserPasswordValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TSetUserPasswordFormSchema = z.infer<typeof SetUserPasswordFormSchema>;
export type TSetUserPasswordValidationSchema = z.infer<typeof SetUserPasswordValidationSchema>;
export type TSetUserPasswordActionSchema = z.infer<typeof SetUserPasswordActionSchema>;

// ---------------------------------------------------------- //
// Revoke User Sessions
// ---------------------------------------------------------- //

export const RevokeUserSessionsValidationSchema = z.object({ userId: z.string() });

export const RevokeUserSessionsActionSchema = z.object({
  payload: RevokeUserSessionsValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TRevokeUserSessionsValidationSchema = z.infer<typeof RevokeUserSessionsValidationSchema>;
export type TRevokeUserSessionsActionSchema = z.infer<typeof RevokeUserSessionsActionSchema>;

// ---------------------------------------------------------- //
// Update User
// ---------------------------------------------------------- //

export const UpdateUserFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, _ and - only")
    .optional()
    .or(z.literal("")),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const UpdateUserValidationSchema = z.object({
  userId: z.string(),
  data: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    username: z.string().optional().nullable(),
    image: z.string().url().optional().nullable(),
  }),
});

export const UpdateUserActionSchema = z.object({
  payload: UpdateUserValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TUpdateUserFormSchema = z.infer<typeof UpdateUserFormSchema>;
export type TUpdateUserValidationSchema = z.infer<typeof UpdateUserValidationSchema>;
export type TUpdateUserActionSchema = z.infer<typeof UpdateUserActionSchema>;

// ---------------------------------------------------------- //
// Impersonate User
// ---------------------------------------------------------- //

export const ImpersonateUserValidationSchema = z.object({ userId: z.string() });

export const ImpersonateUserActionSchema = z.object({
  payload: ImpersonateUserValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TImpersonateUserValidationSchema = z.infer<typeof ImpersonateUserValidationSchema>;
export type TImpersonateUserActionSchema = z.infer<typeof ImpersonateUserActionSchema>;
