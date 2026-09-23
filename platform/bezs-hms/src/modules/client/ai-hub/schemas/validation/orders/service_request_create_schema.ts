import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (
    !v ||
    String(v) === "" ||
    String(v) === "undefined" ||
    String(v) === "null"
  )
    return undefined;
  return String(v);
};

const toOptionalInt = (v: unknown): number | undefined => {
  if (!v) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : Math.floor(n);
};

/**
 * Validates and transforms the service request creation form data.
 *
 * DataSelect id="requester" emits key="ref_id" → form field = requester_ref_id
 * TerminologySelect id="code" valueType="CodeableConcept" → code_code, code_system, code_display, code_text
 * TerminologySelect id="category" valueType="CodeableConcept" → category_code, category_system, category_display, category_text
 * TerminologySelect id="status" valueType="code" → status
 * TerminologySelect id="intent" valueType="code" → intent
 * TerminologySelect id="priority" valueType="code" → priority
 */
export const serviceRequestCreateSchema = z
  .object({
    // Identity — seeded from Better Auth session by route.ts
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient — resolved from me_patient context_resolver
    patient_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),
    // Encounter — from session context
    encounter_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),

    // Order classification
    status: z.string().min(1, "Status is required"),
    intent: z.string().min(1, "Intent is required"),
    priority: z.preprocess(toOptionalStr, z.string().optional()),

    // Procedure / Lab code — TerminologySelect CodeableConcept (id="code")
    code_code: z.preprocess(toOptionalStr, z.string().optional()),
    code_system: z.preprocess(toOptionalStr, z.string().optional()),
    code_display: z.preprocess(toOptionalStr, z.string().optional()),
    code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Category — TerminologySelect CodeableConcept (id="category")
    category_code: z.preprocess(toOptionalStr, z.string().optional()),
    category_system: z.preprocess(toOptionalStr, z.string().optional()),
    category_display: z.preprocess(toOptionalStr, z.string().optional()),
    category_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Requester — DataSelect id="requester", emits key="ref_id" → requester_ref_id
    requester_ref_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),

    // Timing
    authored_on: z.preprocess(toOptionalStr, z.string().optional()),

    // Notes
    note_text: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    status: d.status,
    intent: d.intent,
    priority: d.priority,

    // Coded procedure/lab/imaging
    code_system: d.code_system,
    code_code: d.code_code,
    code_display: d.code_display,
    code_text: d.code_text,

    // Patient & encounter
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,

    // Requester reference
    requester: d.requester_ref_id
      ? `Practitioner/${d.requester_ref_id}`
      : undefined,

    // Authored on datetime
    authored_on: d.authored_on,

    // Category array
    category:
      d.category_code || d.category_text
        ? [
            {
              coding_system: d.category_system,
              coding_code: d.category_code,
              coding_display: d.category_display,
              text: d.category_text,
            },
          ]
        : undefined,

    // Notes array
    note: d.note_text ? [{ text: d.note_text }] : undefined,
  }));
