import { z } from "zod";

/** Coerce a value to a positive integer, returning -1 when absent or invalid. */
const toPositiveInt = (v: unknown) => {
  if (v === undefined || v === null) return -1;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return -1;
  const n = Number(s);
  return isNaN(n) ? -1 : Math.floor(n);
};

/** Coerce a value to a string, returning undefined when absent or the literal "undefined"/"null". */
const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

/**
 * Validates the three-step appointment booking form.
 *
 * Input is the merged sessionContext + current step's form data, so fields
 * from steps 1 (practitioner), 2 (slot), and the context_resolver (patient)
 * are all present alongside step 3's own form fields.
 *
 * Transforms into the exact shape expected by POST /api/fhir/v1/appointments/.
 */
export const appointmentCreateSchema = z
  .object({
    // ── Identity (seeded from Better Auth session by route.ts) ───────────────
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // ── Patient (resolved automatically from /patients/me in step 3) ─────────
    patient_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Patient profile not found — cannot book appointment"),
    ),

    // ── Step 3: appointment details ──────────────────────────────────────────
    status: z.string().min(1, "Status is required"),
    description: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect with valueType="CodeableConcept" emits four hidden inputs
    appointment_type_code: z.preprocess(toOptionalStr, z.string().optional()),
    appointment_type_system: z.preprocess(toOptionalStr, z.string().optional()),
    appointment_type_display: z.preprocess(toOptionalStr, z.string().optional()),
    appointment_type_text: z.preprocess(toOptionalStr, z.string().optional()),

    // ── Step 2: selected slot ─────────────────────────────────────────────────
    slot_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Please select a time slot"),
    ),
    slot_start: z.preprocess(
      toOptionalStr,
      z.string().min(1, "Slot start time is required"),
    ),
    slot_end: z.preprocess(toOptionalStr, z.string().optional()),

    // ── Step 1: selected practitioner ─────────────────────────────────────────
    practitioner_ref_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Please select a practitioner"),
    ),
    practitioner_display: z.preprocess(toOptionalStr, z.string().optional()),

    // Specialty emitted as practitioner_spec_* by DataSelect
    practitioner_spec_system: z.preprocess(toOptionalStr, z.string().optional()),
    practitioner_spec_code: z.preprocess(toOptionalStr, z.string().optional()),
    practitioner_spec_display: z.preprocess(toOptionalStr, z.string().optional()),

    // HealthcareService reference for service_type
    practitioner_svc_ref_id: z.preprocess(
      (v) => {
        const s = String(v ?? "");
        if (!s || s === "undefined" || s === "null") return undefined;
        const n = Number(s);
        return isNaN(n) ? undefined : Math.floor(n);
      },
      z.number().int().positive().optional(),
    ),
    practitioner_svc_display: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => {
    const specialty = d.practitioner_spec_code
      ? [
          {
            coding_system: d.practitioner_spec_system,
            coding_code: d.practitioner_spec_code,
            coding_display: d.practitioner_spec_display,
          },
        ]
      : undefined;

    const serviceType = d.practitioner_svc_ref_id
      ? [
          {
            reference: `HealthcareService/${d.practitioner_svc_ref_id}`,
            reference_display: d.practitioner_svc_display,
          },
        ]
      : undefined;

    return {
      // Identity — required by every FHIR POST endpoint
      user_id: d.user_id,
      org_id: d.org_id,

      status: d.status,
      subject: `Patient/${d.patient_id}`,
      start: d.slot_start,
      end: d.slot_end || undefined,
      slot: [{ reference: `Slot/${d.slot_id}` }],
      specialty: specialty || undefined,
      service_type: serviceType || undefined,
      description: d.description || undefined,
      appointment_type_code: d.appointment_type_code || undefined,
      appointment_type_system: d.appointment_type_system || undefined,
      appointment_type_display: d.appointment_type_display || undefined,
      appointment_type_text: d.appointment_type_text || undefined,
      participant: [
        {
          reference: `Patient/${d.patient_id}`,
          status: "accepted",
        },
        {
          reference: `Practitioner/${d.practitioner_ref_id}`,
          reference_display: d.practitioner_display || undefined,
          status: "needs-action",
        },
      ],
    };
  });
