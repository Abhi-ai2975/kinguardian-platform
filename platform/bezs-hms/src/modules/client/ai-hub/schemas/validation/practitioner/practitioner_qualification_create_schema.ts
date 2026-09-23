import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

export const practitionerQualificationCreateSchema = z.object({
  code_system:    z.preprocess(toOptionalStr, z.string().optional()),
  code_code:      z.preprocess(toOptionalStr, z.string().optional()),
  code_display:   z.preprocess(toOptionalStr, z.string().optional()),
  code_text:      z.preprocess(toOptionalStr, z.string().optional()),
  period_start:   z.preprocess(toOptionalStr, z.string().optional()),
  period_end:     z.preprocess(toOptionalStr, z.string().optional()),
  issuer:         z.preprocess(toOptionalStr, z.string().optional()),
  issuer_display: z.preprocess(toOptionalStr, z.string().optional()),
});
