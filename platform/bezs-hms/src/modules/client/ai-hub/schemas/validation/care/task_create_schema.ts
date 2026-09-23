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

export const taskCreateSchema = z
  .object({
    // Session-seeded identity — required by FHIR server
    user_id: z.preprocess(toOptionalStr, z.string()),
    org_id: z.preprocess(toOptionalStr, z.string()),

    // Session/workflow-seeded context IDs
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    care_plan_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="task_status"
    task_status: z.preprocess(toOptionalStr, z.string()),
    // TerminologySelect code id="task_intent"
    task_intent: z.preprocess(toOptionalStr, z.string()),
    // TerminologySelect code id="priority"
    priority: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="task_code"
    task_code_code: z.preprocess(toOptionalStr, z.string().optional()),
    task_code_system: z.preprocess(toOptionalStr, z.string().optional()),
    task_code_display: z.preprocess(toOptionalStr, z.string().optional()),
    task_code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="task_description"
    task_description: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="requester" emits: requester_ref_id
    requester_ref_id: z.preprocess(toOptionalStr, z.string().optional()),
    // DataSelect id="owner" emits: owner_ref_id
    owner_ref_id: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput id="authored_on"
    authored_on: z.preprocess(toOptionalStr, z.string().optional()),
    // DateTimeInput id="restriction_period_end"
    restriction_period_end: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.task_status,
    intent: d.task_intent,
    priority: d.priority || undefined,
    code_code: d.task_code_code || undefined,
    code_system: d.task_code_system || undefined,
    code_display: d.task_code_display || undefined,
    code_text: d.task_code_text || undefined,
    description: d.task_description || undefined,
    focus: d.care_plan_id ? `CarePlan/${d.care_plan_id}` : undefined,
    for_reference: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id || undefined,
    requester: d.requester_ref_id
      ? `Practitioner/${d.requester_ref_id}`
      : undefined,
    owner: d.owner_ref_id ? `Practitioner/${d.owner_ref_id}` : undefined,
    authored_on: d.authored_on || undefined,
    restriction_period_end: d.restriction_period_end || undefined,
  }));
