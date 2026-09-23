/**
 * clinicalPayloads — form item → FHIR action payload mapping.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * One place that knows how each clinical form item becomes a create or update
 * payload. Two callers need exactly this mapping and must never disagree about
 * it:
 *   - publishClinicalRecords — bulk diff/publish, used by the review page
 *   - persistClinicalEntry   — single-entry writes from the Clinical Records
 *                              workspace, where every edit goes straight to FHIR
 *
 * Immutability caveat (enforced by fhir-gql, mirrored here): child arrays such
 * as category, note, reference_range and dosage_instruction can only be set at
 * CREATE time. Update payloads therefore carry scalar fields only — changing a
 * child array means deleting and re-adding the entry.
 */

import { parseDuration } from "./fromFhir";
import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
} from "./types";

// ── Shared context ────────────────────────────────────────────────────────────

/** What every CREATE needs to attach the resource to a patient and visit. */
export interface ClinicalWriteContext {
  /** FHIR subject reference, e.g. "Patient/10001". */
  subject: string;
  /** FHIR Encounter.id every created resource links to. */
  encounterId: number;
}

// ── Condition ─────────────────────────────────────────────────────────────────

/**
 * Builds the UPDATE payload for a condition.
 *
 * @param c - The form item; must already carry a fhirId.
 */
export function conditionUpdatePayload(c: ConditionFormItem) {
  return {
    id: c.fhirId!,
    code_code: c.resolved?.code,
    code_system: c.resolved?.system,
    code_display: c.resolved?.display ?? c.display,
    code_text: c.display,
    clinical_status_code: c.clinicalStatus ?? "active",
    verification_status_code: c.verificationStatus ?? "confirmed",
    severity_code: c.severity ?? undefined,
    onset_datetime: c.onsetDatetime ?? undefined,
    abatement_datetime: c.abatementDatetime ?? undefined,
  };
}

/**
 * Builds the CREATE payload for a condition, including its child arrays.
 *
 * @param c - The form item.
 * @param ctx - Subject and encounter to link to.
 */
export function conditionCreatePayload(
  c: ConditionFormItem,
  { subject, encounterId }: ClinicalWriteContext,
) {
  return {
    clinical_status_code: c.clinicalStatus ?? "active",
    verification_status_code: c.verificationStatus ?? "confirmed",
    severity_code: c.severity ?? undefined,
    code_code: c.resolved?.code,
    code_system: c.resolved?.system,
    code_display: c.resolved?.display ?? c.display,
    code_text: c.display,
    subject,
    encounter_id: encounterId,
    onset_datetime: c.onsetDatetime ?? undefined,
    abatement_datetime: c.abatementDatetime ?? undefined,
    ...(c.category ? { category: [{ coding_code: c.category }] } : {}),
    ...(c.note ? { note: [{ text: c.note }] } : {}),
  };
}

// ── Observation ───────────────────────────────────────────────────────────────

/**
 * Resolves an observation's value into either a quantity or a string field.
 *
 * The agent and the doctor both enter free text, so a value is only stored as a
 * quantity when it actually parses as a number — otherwise it goes to
 * value_string rather than being silently dropped.
 *
 * @param o - The observation form item.
 */
function observationValueFields(o: ObservationFormItem) {
  const rawValue = o.editedValue ?? o.value ?? null;
  const numericValue = rawValue !== null ? parseFloat(rawValue) : undefined;
  const isNumeric = numericValue !== undefined && !isNaN(numericValue);

  return isNumeric
    ? {
        value_quantity_value: numericValue,
        value_quantity_unit: o.editedUnit ?? o.unit ?? undefined,
      }
    : { value_string: rawValue ?? o.display };
}

/**
 * Builds the UPDATE payload for an observation.
 *
 * @param o - The form item; must already carry a fhirId.
 */
export function observationUpdatePayload(o: ObservationFormItem) {
  return {
    id: o.fhirId!,
    status: o.status ?? "final",
    code_code: o.resolved?.code,
    code_system: o.resolved?.system,
    code_display: o.resolved?.display ?? o.display,
    code_text: o.display,
    effective_date_time: o.effectiveDatetime ?? undefined,
    ...observationValueFields(o),
  };
}

/**
 * Builds the CREATE payload for an observation, including its child arrays.
 *
 * @param o - The form item.
 * @param ctx - Subject and encounter to link to.
 */
export function observationCreatePayload(
  o: ObservationFormItem,
  { subject, encounterId }: ClinicalWriteContext,
) {
  const refRangeLowNum = o.refRangeLow ? parseFloat(o.refRangeLow) : undefined;
  const refRangeHighNum = o.refRangeHigh ? parseFloat(o.refRangeHigh) : undefined;
  const hasRefRange =
    (refRangeLowNum !== undefined && !isNaN(refRangeLowNum)) ||
    (refRangeHighNum !== undefined && !isNaN(refRangeHighNum));

  return {
    status: o.status ?? "final",
    code_code: o.resolved?.code,
    code_system: o.resolved?.system,
    code_display: o.resolved?.display ?? o.display,
    code_text: o.display,
    effective_date_time: o.effectiveDatetime ?? undefined,
    ...observationValueFields(o),
    subject,
    encounter_id: encounterId,
    ...(o.category ? { category: [{ coding_code: o.category }] } : {}),
    ...(o.interpretation
      ? { interpretation: [{ coding_code: o.interpretation }] }
      : {}),
    ...(hasRefRange
      ? {
          reference_range: [
            {
              ...(refRangeLowNum !== undefined && !isNaN(refRangeLowNum)
                ? { low_value: refRangeLowNum, low_unit: o.refRangeUnit }
                : {}),
              ...(refRangeHighNum !== undefined && !isNaN(refRangeHighNum)
                ? { high_value: refRangeHighNum, high_unit: o.refRangeUnit }
                : {}),
            },
          ],
        }
      : {}),
    ...(o.note ? { note: [{ text: o.note }] } : {}),
  };
}

// ── Medication request ────────────────────────────────────────────────────────

/**
 * Builds the UPDATE payload for a medication request.
 *
 * @param m - The form item; must already carry a fhirId.
 */
export function medicationUpdatePayload(m: MedicationFormItem) {
  return {
    id: m.fhirId!,
    status: m.status ?? "active",
    intent: m.intent ?? "order",
    medication_code_code: m.resolved?.code,
    medication_code_system: m.resolved?.system,
    medication_code_display: m.resolved?.display ?? m.display,
    medication_code_text: m.display,
    priority: m.priority ?? undefined,
    course_of_therapy_type_code: m.courseOfTherapyType ?? undefined,
    dispense_number_of_repeats_allowed: m.dispenseRepeatsAllowed ?? undefined,
    dispense_quantity_value: m.dispenseQuantityValue
      ? parseFloat(m.dispenseQuantityValue)
      : undefined,
    dispense_quantity_unit: m.dispenseQuantityUnit ?? undefined,
    substitution_allowed_boolean: m.substitutionAllowed ?? undefined,
  };
}

/**
 * Builds the CREATE payload for a medication request, including dosage.
 *
 * @param m - The form item.
 * @param ctx - Subject and encounter to link to.
 */
export function medicationCreatePayload(
  m: MedicationFormItem,
  { subject, encounterId }: ClinicalWriteContext,
) {
  const parsedDur = parseDuration(m.editedDuration ?? m.duration);

  return {
    status: m.status ?? "active",
    intent: m.intent ?? "order",
    medication_code_code: m.resolved?.code,
    medication_code_system: m.resolved?.system,
    medication_code_display: m.resolved?.display ?? m.display,
    medication_code_text: m.display,
    subject,
    encounter_id: encounterId,
    priority: m.priority ?? undefined,
    course_of_therapy_type_code: m.courseOfTherapyType ?? undefined,
    dispense_number_of_repeats_allowed: m.dispenseRepeatsAllowed ?? undefined,
    dispense_quantity_value: m.dispenseQuantityValue
      ? parseFloat(m.dispenseQuantityValue)
      : undefined,
    dispense_quantity_unit: m.dispenseQuantityUnit ?? undefined,
    substitution_allowed_boolean: m.substitutionAllowed ?? undefined,
    dosage_instruction: [
      {
        text: m.editedDose ?? m.dose ?? undefined,
        route_display: m.editedRoute ?? m.route ?? undefined,
        timing_code_display: m.editedFrequency ?? m.frequency ?? undefined,
        patient_instruction: m.patientInstruction ?? undefined,
        ...(parsedDur
          ? {
              timing_repeat_duration: parsedDur.value,
              timing_repeat_duration_unit: parsedDur.unit,
            }
          : {}),
      },
    ],
    ...(m.reasonCode ? { reason_code: [{ text: m.reasonCode }] } : {}),
    ...(m.note ? { note: [{ text: m.note }] } : {}),
  };
}

// ── Service request ───────────────────────────────────────────────────────────

/**
 * Builds the UPDATE payload for a service request.
 *
 * @param s - The form item; must already carry a fhirId.
 */
export function serviceRequestUpdatePayload(s: ServiceRequestFormItem) {
  return {
    id: s.fhirId!,
    status: s.status ?? "active",
    intent: s.intent ?? "order",
    code_code: s.resolved?.code,
    code_system: s.resolved?.system,
    code_display: s.resolved?.display ?? s.display,
    code_text: s.display,
    priority: s.priority ?? undefined,
    occurrence_datetime: s.occurrenceDatetime ?? undefined,
    patient_instruction: s.patientInstruction ?? undefined,
    as_needed_boolean: s.asNeeded ?? undefined,
  };
}

/**
 * Builds the CREATE payload for a service request, including its child arrays.
 *
 * @param s - The form item.
 * @param ctx - Subject and encounter to link to.
 */
export function serviceRequestCreatePayload(
  s: ServiceRequestFormItem,
  { subject, encounterId }: ClinicalWriteContext,
) {
  return {
    status: s.status ?? "active",
    intent: s.intent ?? "order",
    code_code: s.resolved?.code,
    code_system: s.resolved?.system,
    code_display: s.resolved?.display ?? s.display,
    code_text: s.display,
    priority: s.priority ?? undefined,
    subject,
    encounter_id: encounterId,
    occurrence_datetime: s.occurrenceDatetime ?? undefined,
    patient_instruction: s.patientInstruction ?? undefined,
    as_needed_boolean: s.asNeeded ?? undefined,
    ...(s.category
      ? {
          category: [
            { coding_system: "http://snomed.info/sct", coding_code: s.category },
          ],
        }
      : {}),
    ...(s.reasonCode ? { reason_code: [{ text: s.reasonCode }] } : {}),
    ...(s.note ? { note: [{ text: s.note }] } : {}),
  };
}
