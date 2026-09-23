import { z } from "zod";

const toStrArray = (v: unknown) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" || s === "undefined" ? undefined : [s];
};

export const contactCreateSchema = z.object({
  name_use: z
    .enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"])
    .optional(),
  name_text: z.string().optional(),
  name_family: z.string().optional(),
  name_given: z.string().optional().transform(toStrArray),
  name_prefix: z.string().optional().transform(toStrArray),
  name_suffix: z.string().optional().transform(toStrArray),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  address_use: z.enum(["home", "work", "temp", "old", "billing"]).optional(),
  address_type: z.enum(["postal", "physical", "both"]).optional(),
  address_text: z.string().optional(),
  address_line: z.string().optional().transform(toStrArray),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  organization: z.string().optional(),
  organization_display: z.string().optional(),
});
