import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

const toOptionalInt = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : Math.floor(n);
};

export const encounterCloseSchema = z
  .object({
    // Identity — seeded from session by route.ts
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Encounter ID passed in from workflow context (used for the PATCH URL, not the body)
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status" (final encounter status)
    status: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput id="actual_period_end"
    actual_period_end: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status || undefined,
    actual_period_end: d.actual_period_end || undefined,
  }));
