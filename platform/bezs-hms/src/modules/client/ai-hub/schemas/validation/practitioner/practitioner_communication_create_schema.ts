import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

// TerminologySelect id="language" valueType="CodeableConcept" emits:
// language_code, language_system, language_display, language_text
export const practitionerCommunicationCreateSchema = z.object({
  language_code:    z.preprocess(toOptionalStr, z.string().min(2, "Language code is required")),
  language_system:  z.preprocess(toOptionalStr, z.string().optional()),
  language_display: z.preprocess(toOptionalStr, z.string().optional()),
  language_text:    z.preprocess(toOptionalStr, z.string().optional()),
  preferred:        z.boolean().optional(),
});
