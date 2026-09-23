import {
  TPreferenceTemplateSchema,
  TListPreferenceTemplatesResponseSchema,
  TCreatePreferenceTemplateValidationSchema,
  TUpdatePreferenceTemplateValidationSchema,
  TDeletePreferenceTemplateValidationSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";

export interface IPreferenceTemplatesRepository {
  listPreferenceTemplates(): Promise<TListPreferenceTemplatesResponseSchema>;
  createPreferenceTemplate(
    payload: TCreatePreferenceTemplateValidationSchema,
  ): Promise<TPreferenceTemplateSchema>;
  updatePreferenceTemplate(
    payload: TUpdatePreferenceTemplateValidationSchema,
  ): Promise<TPreferenceTemplateSchema>;
  deletePreferenceTemplate(
    payload: TDeletePreferenceTemplateValidationSchema,
  ): Promise<{ success: boolean }>;
}
