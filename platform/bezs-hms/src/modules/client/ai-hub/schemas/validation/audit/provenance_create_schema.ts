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

export const provenanceCreateSchema = z
  .object({
    // Session-seeded identity
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Required target fields
    target_resource_type: z.preprocess(toOptionalStr, z.string()),
    target_resource_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive(),
    ),

    // TerminologySelect code id="activity_code"
    activity_code: z.preprocess(toOptionalStr, z.string().optional()),
    // TextField id="activity_system"
    activity_system: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="agent" emits: agent_ref_id
    agent_ref_id: z.preprocess(toOptionalStr, z.string().optional()),
    // TextField id="agent_type_code"
    agent_type_code: z.preprocess(toOptionalStr, z.string().optional()),

    // Entity fields
    entity_role: z.preprocess(toOptionalStr, z.string().optional()),
    entity_reference: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput id="recorded"
    recorded: z.preprocess(toOptionalStr, z.string().optional()),
    // TextField id="note"
    note: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    target_resource_type: d.target_resource_type,
    target_resource_id: d.target_resource_id,
    recorded: d.recorded || undefined,
    activity_code: d.activity_code || undefined,
    activity_system: d.activity_system || undefined,
    agents: d.agent_ref_id
      ? [
          {
            type_code: d.agent_type_code || undefined,
            who: `Practitioner/${d.agent_ref_id}`,
          },
        ]
      : undefined,
    entity_role: d.entity_role || undefined,
    entity_reference: d.entity_reference || undefined,
    note: d.note || undefined,
  }));
