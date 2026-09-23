import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

export const practitionerCreateSchema = z.object({
  user_id: z.preprocess(toOptionalStr, z.string().optional()),
  org_id:  z.preprocess(toOptionalStr, z.string().optional()),
  active:     z.boolean().optional(),
  gender:     z.preprocess(toOptionalStr, z.string().optional()),
  birth_date: z.preprocess(toOptionalStr, z.string().optional()),
});
