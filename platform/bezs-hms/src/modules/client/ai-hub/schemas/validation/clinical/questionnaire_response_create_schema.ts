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

/**
 * Validates the questionnaire response creation form.
 *
 * Input is merged sessionContext + form data.
 * patient_id and encounter_id come from sessionContext.
 * items is a RepeatableGroup array (no iterate_key) — submitted as part of the same POST.
 * Transforms into the shape expected by POST /api/fhir/v1/questionnaire-responses/
 */
export const questionnaireResponseCreateSchema = z
  .object({
    // Identity (seeded from session)
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient and encounter from sessionContext
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Questionnaire reference/URL
    questionnaire: z.preprocess(toOptionalStr, z.string().optional()),

    // Status — code-only select (required)
    status: z.preprocess(toOptionalStr, z.string().min(1, "Status is required")),

    // Authored timestamp
    authored: z.preprocess(toOptionalStr, z.string().optional()),

    // Author and source references (optional)
    author: z.preprocess(toOptionalStr, z.string().optional()),
    source: z.preprocess(toOptionalStr, z.string().optional()),

    // Response items — RepeatableGroup array (no iterate_key)
    items: z
      .array(
        z.object({
          link_id: z.string().optional(),
          text: z.string().optional(),
          answer: z.string().optional(),
        }),
      )
      .optional(),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,

    questionnaire: d.questionnaire,
    status: d.status,
    authored: d.authored,
    author: d.author,
    source: d.source,

    // Filter out items without a link_id
    items: d.items
      ?.filter((i) => i.link_id)
      .map((i) => ({
        link_id: i.link_id!,
        text: i.text || undefined,
        answer: i.answer || undefined,
      })),
  }));
