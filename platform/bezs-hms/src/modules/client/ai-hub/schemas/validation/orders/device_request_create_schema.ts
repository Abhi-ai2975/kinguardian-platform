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
 * Validates and transforms the device request creation form data.
 *
 * TerminologySelect id="device_code" valueType="CodeableConcept" → device_code_code, device_code_system, device_code_display, device_code_text
 * TerminologySelect id="status" valueType="code" → status
 * TerminologySelect id="intent" valueType="code" → intent
 * DataSelect id="requester" emits key="ref_id" → requester_ref_id
 */
export const deviceRequestCreateSchema = z
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

    // Device code — TerminologySelect CodeableConcept id="device_code"
    device_code_code: z.preprocess(toOptionalStr, z.string().optional()),
    device_code_system: z.preprocess(toOptionalStr, z.string().optional()),
    device_code_display: z.preprocess(toOptionalStr, z.string().optional()),
    device_code_text: z.preprocess(toOptionalStr, z.string().optional()),

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

    // Coded device type (SNOMED)
    device_code_system: d.device_code_system,
    device_code_code: d.device_code_code,
    device_code_display: d.device_code_display,
    device_code_text: d.device_code_text,

    // Patient & encounter
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,

    // Requester reference
    requester: d.requester_ref_id
      ? `Practitioner/${d.requester_ref_id}`
      : undefined,

    // Authored on datetime
    authored_on: d.authored_on,

    // Notes array
    note: d.note_text ? [{ text: d.note_text }] : undefined,
  }));
