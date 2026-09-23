import { z } from "zod";

const toStrArray = (v: unknown) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" || s === "undefined" ? undefined : [s];
};

export const practitionerNameCreateSchema = z.object({
  use:    z.enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]).optional(),
  text:   z.string().optional(),
  family: z.string().optional(),
  given:  z.string().optional().transform(toStrArray),
  prefix: z.string().optional().transform(toStrArray),
  suffix: z.string().optional().transform(toStrArray),
});
