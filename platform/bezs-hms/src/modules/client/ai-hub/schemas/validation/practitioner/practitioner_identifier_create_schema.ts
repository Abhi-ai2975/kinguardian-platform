import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

export const practitionerIdentifierCreateSchema = z.object({
  use:          z.preprocess(toOptionalStr, z.string().optional()),
  // TerminologySelect CodeableConcept id="identifier_type" → emits identifier_type_code/system/...
  identifier_type_code:    z.preprocess(toOptionalStr, z.string().optional()),
  identifier_type_system:  z.preprocess(toOptionalStr, z.string().optional()),
  identifier_type_display: z.preprocess(toOptionalStr, z.string().optional()),
  identifier_type_text:    z.preprocess(toOptionalStr, z.string().optional()),
  system:   z.preprocess(toOptionalStr, z.string().optional()),
  value:    z.preprocess(toOptionalStr, z.string().min(1, "Identifier value is required")),
  assigner: z.preprocess(toOptionalStr, z.string().optional()),
}).transform((d) => ({
  use:          d.use || undefined,
  type_code:    d.identifier_type_code || undefined,
  type_system:  d.identifier_type_system || undefined,
  type_display: d.identifier_type_display || undefined,
  type_text:    d.identifier_type_text || undefined,
  system:       d.system || undefined,
  value:        d.value,
  assigner:     d.assigner || undefined,
}));
