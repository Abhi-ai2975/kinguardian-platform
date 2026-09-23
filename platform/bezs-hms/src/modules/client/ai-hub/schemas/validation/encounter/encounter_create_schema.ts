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

export const encounterCreateSchema = z
  .object({
    // Identity — seeded from session by route.ts
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient resolved automatically from /patients/me context resolver
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // EpisodeOfCare passed in from step 1 via workflow context
    episode_of_care_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status" (required)
    status: z.string().min(1, "Encounter status is required"),

    // TerminologySelect CodeableConcept id="class" (optional)
    class_code: z.preprocess(toOptionalStr, z.string().optional()),
    class_system: z.preprocess(toOptionalStr, z.string().optional()),
    class_display: z.preprocess(toOptionalStr, z.string().optional()),
    class_text: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="service_type" (optional)
    service_type_code: z.preprocess(toOptionalStr, z.string().optional()),
    service_type_system: z.preprocess(toOptionalStr, z.string().optional()),
    service_type_display: z.preprocess(toOptionalStr, z.string().optional()),
    service_type_text: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="provider" emits provider_ref_id + provider_display
    provider_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    provider_display: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="location" emits location_ref_id + location_display
    location_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    location_display: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="practitioner" emits practitioner_ref_id
    practitioner_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // DateTimeInput id="actual_period_start"
    actual_period_start: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="reason" (server search, SNOMED)
    reason_code: z.preprocess(toOptionalStr, z.string().optional()),
    reason_system: z.preprocess(toOptionalStr, z.string().optional()),
    reason_display: z.preprocess(toOptionalStr, z.string().optional()),
    reason_text: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    status: d.status,

    // FHIR alias "class" — must use computed property key since "class" is a JS reserved word
    ...(d.class_code
      ? {
          class: [
            {
              coding_system: d.class_system,
              coding_code: d.class_code,
              coding_display: d.class_display,
              text: d.class_text,
            },
          ],
        }
      : {}),

    service_type: d.service_type_code
      ? [
          {
            coding_system: d.service_type_system,
            coding_code: d.service_type_code,
            coding_display: d.service_type_display,
            text: d.service_type_text,
          },
        ]
      : undefined,

    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,

    actual_period_start: d.actual_period_start || undefined,

    service_provider: d.provider_ref_id
      ? `Organization/${d.provider_ref_id}`
      : undefined,
    service_provider_display: d.provider_display || undefined,

    participant: d.practitioner_ref_id
      ? [{ reference: `Practitioner/${d.practitioner_ref_id}` }]
      : undefined,

    location: d.location_ref_id
      ? [
          {
            reference: `Location/${d.location_ref_id}`,
            status: "active",
          },
        ]
      : undefined,

    episode_of_care: d.episode_of_care_id
      ? [{ reference: `EpisodeOfCare/${d.episode_of_care_id}` }]
      : undefined,

    reason: d.reason_code
      ? [
          {
            value: [
              {
                coding_system: d.reason_system,
                coding_code: d.reason_code,
                coding_display: d.reason_display,
                text: d.reason_text,
              },
            ],
          },
        ]
      : undefined,
  }));
