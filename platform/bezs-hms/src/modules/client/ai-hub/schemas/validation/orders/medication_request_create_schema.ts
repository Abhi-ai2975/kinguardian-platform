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

const toOptionalFloat = (v: unknown): number | undefined => {
  if (!v) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
};

/**
 * Validates and transforms the medication request creation form data.
 *
 * DataSelect id="medication" emits key="ref_id" → medication_ref_id, key="display" → medication_display
 * DataSelect id="requester" emits key="ref_id" → requester_ref_id
 * TerminologySelect id="medication_code" valueType="CodeableConcept" → medication_code_code, medication_code_system, medication_code_display, medication_code_text
 * TerminologySelect id="route" valueType="CodeableConcept" → route_code, route_system, route_display, route_text
 * TerminologySelect id="status" valueType="code" → status
 * TerminologySelect id="intent" valueType="code" → intent
 */
export const medicationRequestCreateSchema = z
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
    // Condition — carried from Record Condition step in session context
    condition_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),

    // Order classification
    status: z.string().min(1, "Status is required"),
    intent: z.string().min(1, "Intent is required"),

    // Formulary medication — DataSelect id="medication"
    medication_ref_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),
    medication_display: z.preprocess(toOptionalStr, z.string().optional()),

    // RxNorm code search — TerminologySelect CodeableConcept id="medication_code"
    medication_code_code: z.preprocess(toOptionalStr, z.string().optional()),
    medication_code_system: z.preprocess(toOptionalStr, z.string().optional()),
    medication_code_display: z.preprocess(toOptionalStr, z.string().optional()),
    medication_code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Dosage
    dosage_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Route — TerminologySelect CodeableConcept id="route"
    route_code: z.preprocess(toOptionalStr, z.string().optional()),
    route_system: z.preprocess(toOptionalStr, z.string().optional()),
    route_display: z.preprocess(toOptionalStr, z.string().optional()),
    route_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Dispensing
    dispense_quantity: z.preprocess(
      toOptionalFloat,
      z.number().positive().optional(),
    ),
    dispense_unit: z.preprocess(toOptionalStr, z.string().optional()),
    repeats: z.preprocess(
      toOptionalInt,
      z.number().int().nonnegative().optional(),
    ),

    // Requester — DataSelect id="requester", emits key="ref_id" → requester_ref_id
    requester_ref_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),

    // Timing
    authored_on: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    status: d.status,
    intent: d.intent,

    // Medication reference (formulary)
    medication_reference: d.medication_ref_id
      ? `Medication/${d.medication_ref_id}`
      : undefined,

    // Medication code (RxNorm search)
    medication_code_system: d.medication_code_system,
    medication_code_code: d.medication_code_code,
    medication_code_display: d.medication_code_display,
    medication_code_text: d.medication_code_text,

    // Patient & encounter
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,

    // Requester reference
    requester: d.requester_ref_id
      ? `Practitioner/${d.requester_ref_id}`
      : undefined,

    // Authored on datetime
    authored_on: d.authored_on,

    // Dosage instructions
    dosage_instruction:
      d.dosage_text || d.route_code
        ? [
            {
              text: d.dosage_text,
              route_code: d.route_code,
              route_system: d.route_system,
              route_display: d.route_display,
            },
          ]
        : undefined,

    // Dispense request
    dispense_request:
      d.dispense_quantity !== undefined ||
      d.dispense_unit ||
      d.repeats !== undefined
        ? {
            quantity_value: d.dispense_quantity,
            quantity_unit: d.dispense_unit,
            number_of_repeats_allowed: d.repeats,
          }
        : undefined,

    // Reason reference (links to Condition from session)
    reason_reference: d.condition_id
      ? [{ reference: `Condition/${d.condition_id}` }]
      : undefined,
  }));
