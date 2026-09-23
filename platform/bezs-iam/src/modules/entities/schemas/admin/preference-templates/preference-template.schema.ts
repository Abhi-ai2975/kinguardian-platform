import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ------------------------------------------------------------------ //
// Scope enum
// ------------------------------------------------------------------ //

export const PreferenceScopeSchema = z.enum(["GLOBAL", "COUNTRY"]);
export type TPreferenceScopeSchema = z.infer<typeof PreferenceScopeSchema>;

// ------------------------------------------------------------------ //
// DTO — shape of a PreferenceTemplate row from the DB
// ------------------------------------------------------------------ //

export const PreferenceTemplateSchema = z.object({
  id: z.string(),
  scope: PreferenceScopeSchema,
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  dateFormat: z.string().nullable().optional(),
  timeFormat: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  numberFormat: z.string().nullable().optional(),
  weekStart: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TPreferenceTemplateSchema = z.infer<typeof PreferenceTemplateSchema>;

export const ListPreferenceTemplatesResponseSchema = z.object({
  templates: z.array(PreferenceTemplateSchema),
  total: z.number(),
});
export type TListPreferenceTemplatesResponseSchema = z.infer<
  typeof ListPreferenceTemplatesResponseSchema
>;

// ------------------------------------------------------------------ //
// Create PreferenceTemplate
// ------------------------------------------------------------------ //

export const CreatePreferenceTemplateFormSchema = z
  .object({
    scope: PreferenceScopeSchema,
    country: z.string().optional(),
    timezone: z.string().min(1, "Timezone is required"),
    dateFormat: z.string().min(1, "Date format is required"),
    timeFormat: z.string().min(1, "Time format is required"),
    currency: z.string().min(1, "Currency is required"),
    numberFormat: z.string().min(1, "Number format is required"),
    weekStart: z.string().min(1, "Week start is required"),
  })
  .refine((d) => d.scope !== "COUNTRY" || !!d.country, {
    message: "Country is required for a Country-scoped template",
    path: ["country"],
  });
export type TCreatePreferenceTemplateFormSchema = z.infer<
  typeof CreatePreferenceTemplateFormSchema
>;

export const CreatePreferenceTemplateValidationSchema =
  CreatePreferenceTemplateFormSchema;
export type TCreatePreferenceTemplateValidationSchema = z.infer<
  typeof CreatePreferenceTemplateValidationSchema
>;

export const CreatePreferenceTemplateActionSchema = z.object({
  payload: CreatePreferenceTemplateFormSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreatePreferenceTemplateActionSchema = z.infer<
  typeof CreatePreferenceTemplateActionSchema
>;

// ------------------------------------------------------------------ //
// Update PreferenceTemplate
// ------------------------------------------------------------------ //

export const UpdatePreferenceTemplateFormSchema = z
  .object({
    scope: PreferenceScopeSchema,
    country: z.string().optional(),
    timezone: z.string().min(1, "Timezone is required"),
    dateFormat: z.string().min(1, "Date format is required"),
    timeFormat: z.string().min(1, "Time format is required"),
    currency: z.string().min(1, "Currency is required"),
    numberFormat: z.string().min(1, "Number format is required"),
    weekStart: z.string().min(1, "Week start is required"),
  })
  .refine((d) => d.scope !== "COUNTRY" || !!d.country, {
    message: "Country is required for a Country-scoped template",
    path: ["country"],
  });
export type TUpdatePreferenceTemplateFormSchema = z.infer<
  typeof UpdatePreferenceTemplateFormSchema
>;

export const UpdatePreferenceTemplateValidationSchema =
  UpdatePreferenceTemplateFormSchema.and(z.object({ id: z.string().min(1) }));
export type TUpdatePreferenceTemplateValidationSchema = z.infer<
  typeof UpdatePreferenceTemplateValidationSchema
>;

export const UpdatePreferenceTemplateActionSchema = z.object({
  payload: UpdatePreferenceTemplateValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdatePreferenceTemplateActionSchema = z.infer<
  typeof UpdatePreferenceTemplateActionSchema
>;

// ------------------------------------------------------------------ //
// Delete PreferenceTemplate
// ------------------------------------------------------------------ //

export const DeletePreferenceTemplateValidationSchema = z.object({
  id: z.string().min(1),
});
export type TDeletePreferenceTemplateValidationSchema = z.infer<
  typeof DeletePreferenceTemplateValidationSchema
>;

export const DeletePreferenceTemplateActionSchema = z.object({
  payload: DeletePreferenceTemplateValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePreferenceTemplateActionSchema = z.infer<
  typeof DeletePreferenceTemplateActionSchema
>;
