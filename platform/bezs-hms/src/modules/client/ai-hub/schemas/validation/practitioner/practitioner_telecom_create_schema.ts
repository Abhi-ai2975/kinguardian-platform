import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

export const practitionerTelecomCreateSchema = z.object({
  system: z.preprocess(toOptionalStr, z.string().min(1, "Contact type is required")),
  value:  z.preprocess(toOptionalStr, z.string().min(1, "Contact value is required")),
  use:    z.preprocess(toOptionalStr, z.string().optional()),
  rank:   z.preprocess((v) => {
    const s = String(v ?? "");
    if (!s || s === "undefined" || s === "null") return undefined;
    const n = Number(s);
    return isNaN(n) ? undefined : Math.floor(n);
  }, z.number().int().positive().optional()),
});
