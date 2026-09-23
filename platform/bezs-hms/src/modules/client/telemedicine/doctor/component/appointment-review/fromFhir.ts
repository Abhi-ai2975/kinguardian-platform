/**
 * fromFhir — converters that rehydrate saved FHIR records into editable form items.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * When a doctor revisits an appointment that already has clinical records saved
 * in the EMR, the form state must be seeded from those records rather than from
 * the AI extraction. These converters map each FHIR response shape back to its
 * corresponding *FormItem, setting `fhirId` so the publish diff-sync knows to
 * UPDATE the record rather than CREATE a duplicate.
 *
 * Shared by AppointmentReview (post-consultation review) and the Clinical
 * Records workspace — both seed state the same way.
 */

import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
} from "./types";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";

// ── Reverse-map FHIR system URL → short terminology system name ───────────────

/** Maps FHIR system URL to the short name used internally (e.g. for TerminologyCombobox). */
export const SYSTEM_URL_TO_NAME: Record<string, string> = {
  "http://snomed.info/sct": "SNOMED",
  "http://loinc.org": "LOINC",
  "http://www.nlm.nih.gov/research/umls/rxnorm": "RXNORM",
  "http://hl7.org/fhir/sid/icd-10-cm": "ICD-10",
};

/**
 * Converts a FHIR system URL to a short name; defaults to "SNOMED" if unknown.
 *
 * @param url - Full FHIR system URL from a saved record.
 * @returns Short terminology system name.
 */
export function systemName(url: string | null | undefined): string {
  return (url && SYSTEM_URL_TO_NAME[url]) ?? "SNOMED";
}

/**
 * Parses a free-text duration string (e.g. "7 days", "2 weeks") into a numeric
 * value + UCUM unit string for dosage_instruction.timing_repeat_duration.
 *
 * @param s - Free-text duration from the form.
 * @returns Parsed duration object or null if the string cannot be parsed.
 */
export function parseDuration(
  s: string | null | undefined,
): { value: number; unit: string } | null {
  if (!s) return null;
  const m = s
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|hour|hours|min|mins|minute|minutes)$/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const raw = m[2].toLowerCase();
  const unit = raw.startsWith("day")
    ? "d"
    : raw.startsWith("week")
      ? "wk"
      : raw.startsWith("month")
        ? "mo"
        : raw.startsWith("hour")
          ? "h"
          : "min";
  return { value, unit };
}

// ── FHIR record → FormItem converters ────────────────────────────────────────

/**
 * Converts a saved FHIR Condition response to a ConditionFormItem.
 * Sets fhirId so the diff-sync knows to UPDATE rather than CREATE.
 *
 * @param c - Saved FHIR Condition record.
 * @returns Editable condition form item.
 */
export function conditionFromFhir(c: TConditionResponse): ConditionFormItem {
  return {
    id: String(c.id),
    fhirId: c.id,
    display: c.code_display ?? c.code_text ?? "Unknown condition",
    terminologySystem: systemName(c.code_system),
    resolved: c.code_code
      ? {
          code: c.code_code,
          system: c.code_system ?? "",
          display: c.code_display ?? "",
          text: c.code_text ?? c.code_display ?? "",
        }
      : undefined,
    clinicalStatus: c.clinical_status_code ?? undefined,
    verificationStatus: c.verification_status_code ?? undefined,
    severity: c.severity_code ?? undefined,
    category: c.category?.[0]?.coding_code ?? undefined,
    onsetDatetime: c.onset_datetime ?? undefined,
    abatementDatetime: c.abatement_datetime ?? undefined,
    note: c.note?.[0]?.text ?? undefined,
  };
}

/**
 * Converts a saved FHIR Observation response to an ObservationFormItem.
 * Sets fhirId so the diff-sync knows to UPDATE rather than CREATE.
 *
 * @param o - Saved FHIR Observation record.
 * @returns Editable observation form item.
 */
export function observationFromFhir(o: TObservationResponse): ObservationFormItem {
  const numVal = o.value_quantity_value != null ? String(o.value_quantity_value) : null;
  return {
    id: String(o.id),
    fhirId: o.id,
    display: o.code_display ?? o.code_text ?? "Unknown observation",
    terminologySystem: systemName(o.code_system),
    value: numVal ?? o.value_string ?? null,
    unit: o.value_quantity_unit ?? null,
    resolved: o.code_code
      ? {
          code: o.code_code,
          system: o.code_system ?? "",
          display: o.code_display ?? "",
          text: o.code_text ?? o.code_display ?? "",
        }
      : undefined,
    status: o.status ?? undefined,
    effectiveDatetime: o.effective_date_time ?? undefined,
    /* category / interpretation / reference_range are child arrays — not updatable,
       but rehydrate for display so the doctor can see what was saved. */
    category: o.category?.[0]?.coding_code ?? undefined,
    interpretation: o.interpretation?.[0]?.coding_code ?? undefined,
    refRangeLow:
      o.reference_range?.[0]?.low_value != null
        ? String(o.reference_range[0].low_value)
        : undefined,
    refRangeHigh:
      o.reference_range?.[0]?.high_value != null
        ? String(o.reference_range[0].high_value)
        : undefined,
    refRangeUnit: o.reference_range?.[0]?.low_unit ?? undefined,
    note: o.note?.[0]?.text ?? undefined,
  };
}

/**
 * Converts a saved FHIR MedicationRequest response to a MedicationFormItem.
 * Sets fhirId so the diff-sync knows to UPDATE rather than CREATE.
 * Note: dosage_instruction children are immutable in the FHIR API — dosage
 * edits on existing items require delete + re-add by the doctor.
 *
 * @param m - Saved FHIR MedicationRequest record.
 * @returns Editable medication form item.
 */
export function medicationFromFhir(m: TMedicationRequestResponse): MedicationFormItem {
  const dosage = m.dosage_instruction?.[0];
  /* Reconstruct duration string from timing_repeat_duration + unit if present. */
  const durValue = dosage?.timing_repeat_duration;
  const durUnit = dosage?.timing_repeat_duration_unit;
  const duration =
    durValue != null && durUnit
      ? `${durValue} ${durUnit}`
      : null;

  return {
    id: String(m.id),
    fhirId: m.id,
    display: m.medication_code_display ?? m.medication_code_text ?? "Unknown medication",
    terminologySystem: systemName(m.medication_code_system),
    dose: dosage?.text ?? null,
    frequency: dosage?.timing_code_display ?? null,
    duration,
    route: dosage?.route_display ?? dosage?.route_text ?? null,
    resolved: m.medication_code_code
      ? {
          code: m.medication_code_code,
          system: m.medication_code_system ?? "",
          display: m.medication_code_display ?? "",
          text: m.medication_code_text ?? m.medication_code_display ?? "",
        }
      : undefined,
    status: m.status ?? undefined,
    intent: m.intent ?? undefined,
    priority: m.priority ?? undefined,
    courseOfTherapyType: m.course_of_therapy_type_code ?? undefined,
    /* reason_code / note are child arrays — rehydrate first entry for display. */
    reasonCode: m.reason_code?.[0]?.text ?? m.reason_code?.[0]?.coding_display ?? undefined,
    patientInstruction: dosage?.patient_instruction ?? undefined,
    dispenseRepeatsAllowed: m.dispense_number_of_repeats_allowed ?? undefined,
    dispenseQuantityValue:
      m.dispense_quantity_value != null ? String(m.dispense_quantity_value) : undefined,
    dispenseQuantityUnit: m.dispense_quantity_unit ?? undefined,
    substitutionAllowed: m.substitution_allowed_boolean ?? undefined,
    note: m.note?.[0]?.text ?? undefined,
  };
}

/**
 * Converts a saved FHIR ServiceRequest response to a ServiceRequestFormItem.
 * Sets fhirId so the diff-sync knows to UPDATE rather than CREATE.
 *
 * @param s - Saved FHIR ServiceRequest record.
 * @returns Editable service request form item.
 */
export function serviceRequestFromFhir(s: TServiceRequestResponse): ServiceRequestFormItem {
  return {
    id: String(s.id),
    fhirId: s.id,
    display: s.code_display ?? s.code_text ?? "Unknown order",
    terminologySystem: systemName(s.code_system),
    resolved: s.code_code
      ? {
          code: s.code_code,
          system: s.code_system ?? "",
          display: s.code_display ?? "",
          text: s.code_text ?? s.code_display ?? "",
        }
      : undefined,
    status: s.status ?? undefined,
    intent: s.intent ?? undefined,
    priority: s.priority ?? undefined,
    category: s.category?.[0]?.coding_code ?? undefined,
    occurrenceDatetime: s.occurrence_datetime ?? undefined,
    patientInstruction: s.patient_instruction ?? undefined,
    asNeeded: s.as_needed_boolean ?? undefined,
    /* reason_code / note are child arrays — rehydrate first entry for display. */
    reasonCode: s.reason_code?.[0]?.text ?? s.reason_code?.[0]?.coding_display ?? undefined,
    note: s.note?.[0]?.text ?? undefined,
  };
}
