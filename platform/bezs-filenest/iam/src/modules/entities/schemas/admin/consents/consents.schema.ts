import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ------------------------------------------------------- //
// Base consent schema (matches Better Auth oauthConsent table)

export const ConsentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  userId: z.string().nullable(),
  referenceId: z.string().nullable(),
  scopes: z.array(z.string()),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

export type TConsentSchema = z.infer<typeof ConsentSchema>;

export const ListConsentsResponseSchema = z.array(ConsentSchema);
export type TListConsentsResponseSchema = z.infer<
  typeof ListConsentsResponseSchema
>;

// ------------------------------------------------------- //
// Validation schemas

export const GetConsentValidationSchema = z.object({
  id: z.string(),
});

export type TGetConsentValidationSchema = z.infer<
  typeof GetConsentValidationSchema
>;

export const DeleteConsentValidationSchema = z.object({
  id: z.string(),
});

export type TDeleteConsentValidationSchema = z.infer<
  typeof DeleteConsentValidationSchema
>;

export const UpdateConsentScopesValidationSchema = z.object({
  id: z.string(),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
});

export type TUpdateConsentScopesValidationSchema = z.infer<
  typeof UpdateConsentScopesValidationSchema
>;

// ------------------------------------------------------- //
// Form schemas

export const UpdateConsentScopesFormSchema = UpdateConsentScopesValidationSchema;
export type TUpdateConsentScopesFormSchema = z.infer<
  typeof UpdateConsentScopesFormSchema
>;

// ------------------------------------------------------- //
// Action schemas

export const DeleteConsentActionSchema = z.object({
  payload: DeleteConsentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TDeleteConsentActionSchema = z.infer<
  typeof DeleteConsentActionSchema
>;

export const UpdateConsentScopesActionSchema = z.object({
  payload: UpdateConsentScopesValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TUpdateConsentScopesActionSchema = z.infer<
  typeof UpdateConsentScopesActionSchema
>;
