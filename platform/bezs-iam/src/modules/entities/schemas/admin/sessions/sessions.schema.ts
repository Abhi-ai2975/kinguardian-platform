import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ---------------------------------------------------------- //
// Base schemas
// ---------------------------------------------------------- //

export const SessionWithUserSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  impersonatedBy: z.string().nullable().optional(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    image: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
  }),
});

export const GetAllSessionsResponseDtoSchema = z.object({
  sessions: z.array(SessionWithUserSchema),
});

export type TSessionWithUserSchema = z.infer<typeof SessionWithUserSchema>;
export type TGetAllSessionsResponseDtoSchema = z.infer<typeof GetAllSessionsResponseDtoSchema>;

// ---------------------------------------------------------- //
// Revoke Session (single)
// ---------------------------------------------------------- //

export const RevokeSessionValidationSchema = z.object({
  sessionToken: z.string(),
});

export const RevokeSessionActionSchema = z.object({
  payload: RevokeSessionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TRevokeSessionValidationSchema = z.infer<typeof RevokeSessionValidationSchema>;
export type TRevokeSessionActionSchema = z.infer<typeof RevokeSessionActionSchema>;

// ---------------------------------------------------------- //
// Revoke All Sessions
// ---------------------------------------------------------- //

export const RevokeAllSessionsActionSchema = z.object({
  transportOptions: TransportOptionsSchema.optional(),
});

export type TRevokeAllSessionsActionSchema = z.infer<typeof RevokeAllSessionsActionSchema>;
