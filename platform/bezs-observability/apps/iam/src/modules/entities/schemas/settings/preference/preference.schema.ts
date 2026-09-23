import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ------------------------------------------------------------------ //
// DTO — shape of a UserPreference row from the DB
// ------------------------------------------------------------------ //

export const UserPreferenceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  timezone: z.string().nullable().optional(),
  dateFormat: z.string().nullable().optional(),
  timeFormat: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  numberFormat: z.string().nullable().optional(),
  weekStart: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TUserPreferenceSchema = z.infer<typeof UserPreferenceSchema>;

// ------------------------------------------------------------------ //
// Update UserPreference
// ------------------------------------------------------------------ //

export const UpdateUserPreferenceFormSchema = z.object({
  country: z.string().min(1, "Country is required"),
  timezone: z.string().min(1, "Timezone is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  timeFormat: z.string().min(1, "Time format is required"),
  currency: z.string().min(1, "Currency is required"),
  numberFormat: z.string().min(1, "Number format is required"),
  weekStart: z.string().min(1, "Week start is required"),
});
export type TUpdateUserPreferenceFormSchema = z.infer<
  typeof UpdateUserPreferenceFormSchema
>;

// Includes userId injected server-side from the session
export const UpdateUserPreferenceValidationSchema =
  UpdateUserPreferenceFormSchema.extend({
    userId: z.string().min(1),
  });
export type TUpdateUserPreferenceValidationSchema = z.infer<
  typeof UpdateUserPreferenceValidationSchema
>;

export const UpdateUserPreferenceActionSchema = z.object({
  payload: UpdateUserPreferenceFormSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateUserPreferenceActionSchema = z.infer<
  typeof UpdateUserPreferenceActionSchema
>;
