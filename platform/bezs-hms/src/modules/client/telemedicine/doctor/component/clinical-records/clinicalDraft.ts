/**
 * clinicalDraft — seeding and normalisation for the Clinical Records workspace.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * The workspace can be seeded from three sources, in descending authority:
 *
 *   1. Records already published to the EMR (FHIR Condition/Observation/…).
 *      These carry a fhirId, so edits UPDATE rather than duplicate.
 *   2. The staging draft on the Consultation row — what the doctor last typed
 *      but has not published yet.
 *   3. The AI full-report's clinicalExtraction — the first-visit seed.
 *
 * Staging is stored as loose JSON (`z.array(z.unknown())`), and two different
 * writers put things there: this workspace writes *FormItem objects, while the
 * clinical-extraction-agent writes items without an `id`. The normalisers below
 * accept either and produce valid form items, minting ids where missing.
 */

import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
  SoapNote,
} from "../appointment-review/types";

// ── Blank SOAP ────────────────────────────────────────────────────────────────

/** Blank SOAP note used when neither the AI nor the doctor produced one. */
export const EMPTY_SOAP: SoapNote = {
  subjective: {
    chief_complaint: "",
    history_of_present_illness: "",
    associated_symptoms: [],
  },
  objective: { observations: [] },
  assessment: { possible_conditions: [], clinical_reasoning: "" },
  plan: { next_steps: [], when_to_seek_care: "" },
  summary: "",
};

// ── Primitive readers ─────────────────────────────────────────────────────────

/**
 * Reads a string property from an unknown record.
 *
 * @param src - Source record.
 * @param key - Property name.
 * @returns The string value, or undefined when absent or not a string.
 */
function str(src: Record<string, unknown>, key: string): string | undefined {
  const v = src[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * Reads a number property from an unknown record.
 *
 * @param src - Source record.
 * @param key - Property name.
 * @returns The numeric value, or undefined when absent or not a number.
 */
function num(src: Record<string, unknown>, key: string): number | undefined {
  const v = src[key];
  return typeof v === "number" ? v : undefined;
}

/**
 * Reads a boolean property from an unknown record.
 *
 * @param src - Source record.
 * @param key - Property name.
 * @returns The boolean value, or undefined when absent or not a boolean.
 */
function bool(src: Record<string, unknown>, key: string): boolean | undefined {
  const v = src[key];
  return typeof v === "boolean" ? v : undefined;
}

/**
 * Reads a nullable string property, preserving an explicit null.
 * Used for fields typed `string | null` on the form items.
 *
 * @param src - Source record.
 * @param key - Property name.
 * @returns The string, or null when absent/not a string.
 */
function nullableStr(src: Record<string, unknown>, key: string): string | null {
  const v = src[key];
  return typeof v === "string" ? v : null;
}

/**
 * Narrows an unknown staged entry to a plain object.
 *
 * @param raw - Raw staged entry.
 * @returns The entry as a record, or null when it is not an object.
 */
function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

/**
 * Returns the entry's existing id, or a fresh one when it came from the agent.
 *
 * @param src - Source record.
 * @returns A stable list key.
 */
function idOf(src: Record<string, unknown>): string {
  return str(src, "id") ?? crypto.randomUUID();
}

/**
 * Rehydrates the `resolved` terminology concept if the draft carried one.
 *
 * @param src - Source record.
 * @returns The resolved concept, or undefined when incomplete.
 */
function resolvedOf(src: Record<string, unknown>) {
  const r = asRecord(src.resolved);
  if (!r) return undefined;
  const code = str(r, "code");
  if (!code) return undefined;
  return {
    code,
    system: str(r, "system") ?? "",
    display: str(r, "display") ?? "",
    text: str(r, "text") ?? str(r, "display") ?? "",
  };
}

// ── Per-resource normalisers ──────────────────────────────────────────────────

/**
 * Normalises staged/AI condition entries into ConditionFormItems.
 *
 * @param raw - Staged JSON array (unknown shape).
 * @returns Valid condition form items; unparseable entries are dropped.
 */
export function normaliseConditions(raw: unknown): ConditionFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const src = asRecord(entry);
    if (!src) return [];
    const display = str(src, "display");
    if (!display) return [];
    return [
      {
        id: idOf(src),
        fhirId: num(src, "fhirId"),
        display,
        terminologySystem: str(src, "terminologySystem") ?? "SNOMED",
        resolved: resolvedOf(src),
        clinicalStatus: str(src, "clinicalStatus"),
        verificationStatus: str(src, "verificationStatus"),
        severity: str(src, "severity"),
        category: str(src, "category"),
        onsetDatetime: str(src, "onsetDatetime"),
        abatementDatetime: str(src, "abatementDatetime"),
        note: str(src, "note"),
      } satisfies ConditionFormItem,
    ];
  });
}

/**
 * Normalises staged/AI observation entries into ObservationFormItems.
 *
 * @param raw - Staged JSON array (unknown shape).
 * @returns Valid observation form items; unparseable entries are dropped.
 */
export function normaliseObservations(raw: unknown): ObservationFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const src = asRecord(entry);
    if (!src) return [];
    const display = str(src, "display");
    if (!display) return [];
    return [
      {
        id: idOf(src),
        fhirId: num(src, "fhirId"),
        display,
        terminologySystem: str(src, "terminologySystem") ?? "LOINC",
        value: nullableStr(src, "value"),
        unit: nullableStr(src, "unit"),
        resolved: resolvedOf(src),
        status: str(src, "status"),
        editedValue: str(src, "editedValue"),
        editedUnit: str(src, "editedUnit"),
        category: str(src, "category"),
        effectiveDatetime: str(src, "effectiveDatetime"),
        interpretation: str(src, "interpretation"),
        refRangeLow: str(src, "refRangeLow"),
        refRangeHigh: str(src, "refRangeHigh"),
        refRangeUnit: str(src, "refRangeUnit"),
        note: str(src, "note"),
      } satisfies ObservationFormItem,
    ];
  });
}

/**
 * Normalises staged/AI medication entries into MedicationFormItems.
 *
 * @param raw - Staged JSON array (unknown shape).
 * @returns Valid medication form items; unparseable entries are dropped.
 */
export function normaliseMedications(raw: unknown): MedicationFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const src = asRecord(entry);
    if (!src) return [];
    const display = str(src, "display");
    if (!display) return [];
    return [
      {
        id: idOf(src),
        fhirId: num(src, "fhirId"),
        display,
        terminologySystem: str(src, "terminologySystem") ?? "RXNORM",
        dose: nullableStr(src, "dose"),
        frequency: nullableStr(src, "frequency"),
        duration: nullableStr(src, "duration"),
        route: nullableStr(src, "route"),
        resolved: resolvedOf(src),
        status: str(src, "status"),
        intent: str(src, "intent"),
        editedDose: str(src, "editedDose"),
        editedFrequency: str(src, "editedFrequency"),
        editedDuration: str(src, "editedDuration"),
        editedRoute: str(src, "editedRoute"),
        priority: str(src, "priority"),
        courseOfTherapyType: str(src, "courseOfTherapyType"),
        reasonCode: str(src, "reasonCode"),
        patientInstruction: str(src, "patientInstruction"),
        dispenseRepeatsAllowed: num(src, "dispenseRepeatsAllowed"),
        dispenseQuantityValue: str(src, "dispenseQuantityValue"),
        dispenseQuantityUnit: str(src, "dispenseQuantityUnit"),
        substitutionAllowed: bool(src, "substitutionAllowed"),
        note: str(src, "note"),
      } satisfies MedicationFormItem,
    ];
  });
}

/**
 * Normalises staged/AI service request entries into ServiceRequestFormItems.
 *
 * @param raw - Staged JSON array (unknown shape).
 * @returns Valid service request form items; unparseable entries are dropped.
 */
export function normaliseServiceRequests(raw: unknown): ServiceRequestFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const src = asRecord(entry);
    if (!src) return [];
    const display = str(src, "display");
    if (!display) return [];
    return [
      {
        id: idOf(src),
        fhirId: num(src, "fhirId"),
        display,
        terminologySystem: str(src, "terminologySystem") ?? "LOINC",
        resolved: resolvedOf(src),
        status: str(src, "status"),
        intent: str(src, "intent"),
        priority: str(src, "priority"),
        category: str(src, "category"),
        occurrenceDatetime: str(src, "occurrenceDatetime"),
        reasonCode: str(src, "reasonCode"),
        patientInstruction: str(src, "patientInstruction"),
        asNeeded: bool(src, "asNeeded"),
        note: str(src, "note"),
      } satisfies ServiceRequestFormItem,
    ];
  });
}

// ── SOAP seeding ──────────────────────────────────────────────────────────────

/**
 * Keys that appear on a SOAP note and never on the agent's wrapper.
 *
 * `assessment` is deliberately excluded even though the note has one: the
 * wrapper carries its own `assessment` (the AI risk/differential plan), so
 * testing for it would identify the wrapper as the note and defeat the unwrap.
 */
const NOTE_ONLY_KEYS = [
  "subjective",
  "objective",
  "plan",
  "summary",
] as const;

/**
 * Reports whether a record carries SOAP sections unique to the note.
 *
 * @param record - Candidate record.
 */
function isSoapNote(record: Record<string, unknown>): boolean {
  return NOTE_ONLY_KEYS.some((key) => key in record);
}

/**
 * Digs the SOAP note out of whatever the consultation stored.
 *
 * The doctor-report agent returns `{ soap, assessment, clinicalExtraction }` —
 * the note is nested under `soap`, and both `Consultation.soap_note` and
 * `full_report.soap_report` hold that whole wrapper rather than the note.
 * Reading a wrapper as if it were the note finds no sections and yields a blank
 * editor, so the nested note is preferred whenever one is present.
 *
 * An already-unwrapped value is returned as-is, which covers the doctor's own
 * staged draft — this workspace saves the note back unwrapped.
 *
 * @param value - `soap_note`, `soap_report`, or an already-unwrapped note.
 * @returns The note, or null when the value holds no SOAP sections.
 */
export function unwrapSoapNote(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) return null;

  /* Nested note first — a wrapper also has an `assessment` key of its own, so
     testing the outer record first would wrongly accept it. */
  const nested = asRecord(record.soap);
  if (nested && isSoapNote(nested)) return nested;

  if (isSoapNote(record)) return record;

  return null;
}

/**
 * Picks the SOAP note to seed the editor with.
 *
 * Prefers the doctor's staged draft over the AI report, since the draft is by
 * definition the more recent of the two. Both are unwrapped first — see
 * unwrapSoapNote for why either can arrive wrapped.
 *
 * @param stagedSoap - `Consultation.soap_note` (the doctor's draft).
 * @param aiSoap - SOAP from the AI full report.
 * @returns A complete SoapNote with every section present.
 */
export function seedSoapNote(
  stagedSoap: unknown,
  aiSoap: unknown,
): SoapNote {
  const source = unwrapSoapNote(stagedSoap) ?? unwrapSoapNote(aiSoap);
  if (!source) return EMPTY_SOAP;

  const partial = source as Partial<SoapNote>;
  return {
    subjective: {
      chief_complaint: partial.subjective?.chief_complaint ?? "",
      history_of_present_illness:
        partial.subjective?.history_of_present_illness ?? "",
      associated_symptoms: partial.subjective?.associated_symptoms ?? [],
    },
    objective: { observations: partial.objective?.observations ?? [] },
    assessment: {
      possible_conditions: partial.assessment?.possible_conditions ?? [],
      clinical_reasoning: partial.assessment?.clinical_reasoning ?? "",
    },
    plan: {
      next_steps: partial.plan?.next_steps ?? [],
      when_to_seek_care: partial.plan?.when_to_seek_care ?? "",
    },
    summary: partial.summary ?? "",
  };
}
