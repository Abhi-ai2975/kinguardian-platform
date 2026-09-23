/**
 * Appointment Review types — shared type definitions for the post-consultation review UI.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * Defines the SOAP note shape, form item types for each FHIR resource category,
 * the StagingReport shape (AI-generated report from the full-report-agent),
 * FHIR terminology system URL map, and FHIR enum fallback arrays.
 */

/** Maps short system names to full FHIR system URLs for terminology lookups. */
export const TERMINOLOGY_SYSTEM_URL: Record<string, string> = {
  SNOMED: "http://snomed.info/sct",
  LOINC: "http://loinc.org",
  RXNORM: "http://www.nlm.nih.gov/research/umls/rxnorm",
  "ICD-10": "http://hl7.org/fhir/sid/icd-10-cm",
};

/** A concept resolved from the terminology server (code + system + display). */
export interface ResolvedConcept {
  code: string;
  system: string;
  display: string;
  /** Human-readable label stored in CodeableConcept.text. */
  text: string;
}

// ── SOAP ──────────────────────────────────────────────────────────────────────

/** Structured SOAP note as returned by the full-report-agent. */
export interface SoapNote {
  subjective: {
    chief_complaint: string;
    history_of_present_illness: string;
    associated_symptoms: string[];
  };
  objective: {
    observations: string[];
  };
  assessment: {
    possible_conditions: string[];
    clinical_reasoning: string;
  };
  plan: {
    next_steps: string[];
    when_to_seek_care: string;
  };
  summary: string;
}

// ── Raw AI extraction shapes ───────────────────────────────────────────────────

/** Condition as extracted by the clinical-extraction-agent. */
export interface AiCondition {
  display: string;
  terminologySystem: string;
}

/** Observation as extracted by the clinical-extraction-agent. */
export interface AiObservation {
  display: string;
  terminologySystem: string;
  value: string | null;
  unit: string | null;
}

/** Medication request as extracted by the clinical-extraction-agent. */
export interface AiMedicationRequest {
  display: string;
  terminologySystem: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;
}

/** Service request as extracted by the clinical-extraction-agent. */
export interface AiServiceRequest {
  display: string;
  terminologySystem: string;
}

// ── Form item shapes (AI extraction + doctor edits + resolved FHIR code) ──────

/** Condition form item — AI suggestion plus doctor-resolved terminology code and status. */
export interface ConditionFormItem extends AiCondition {
  id: string;
  /** Numeric FHIR DB id — set when this item was loaded from an existing FHIR record. */
  fhirId?: number;
  resolved?: ResolvedConcept;
  clinicalStatus?: string;
  verificationStatus?: string;
  /** SNOMED severity code — mild (255604002) / moderate (6736007) / severe (24484000). */
  severity?: string;
  /** Condition category code e.g. "encounter-diagnosis". Immutable child array — CREATE only. */
  category?: string;
  /** ISO date string for onset_datetime. */
  onsetDatetime?: string;
  /** ISO date string for abatement_datetime. */
  abatementDatetime?: string;
  /** Free-text note (note[0].text). Immutable child array — CREATE only. */
  note?: string;
}

/** Observation form item — AI suggestion plus doctor-edited value/unit and resolved code. */
export interface ObservationFormItem extends AiObservation {
  id: string;
  /** Numeric FHIR DB id — set when this item was loaded from an existing FHIR record. */
  fhirId?: number;
  resolved?: ResolvedConcept;
  status?: string;
  editedValue?: string;
  editedUnit?: string;
  /** Observation category code e.g. "vital-signs". Immutable child array — CREATE only. */
  category?: string;
  /** ISO datetime for effective_date_time. Updatable on existing records. */
  effectiveDatetime?: string;
  /** Interpretation code — N / H / L / A / HH / LL. Immutable child array — CREATE only. */
  interpretation?: string;
  /** Reference range low value (string for input binding). Immutable child array — CREATE only. */
  refRangeLow?: string;
  /** Reference range high value. Immutable child array — CREATE only. */
  refRangeHigh?: string;
  /** Unit for both low and high bounds of the reference range. CREATE only. */
  refRangeUnit?: string;
  /** Free-text note (note[0].text). Immutable child array — CREATE only. */
  note?: string;
}

/** Medication form item — AI suggestion plus doctor-edited dosage fields and resolved code. */
export interface MedicationFormItem extends AiMedicationRequest {
  id: string;
  /** Numeric FHIR DB id — set when this item was loaded from an existing FHIR record. */
  fhirId?: number;
  resolved?: ResolvedConcept;
  status?: string;
  intent?: string;
  editedDose?: string;
  editedFrequency?: string;
  editedDuration?: string;
  editedRoute?: string;
  /** Request priority — routine / urgent / asap / stat. Updatable. */
  priority?: string;
  /** Course of therapy type code — acute / continuous / seasonal. Updatable. */
  courseOfTherapyType?: string;
  /** Clinical indication for the prescription (reason_code[0].text). CREATE only. */
  reasonCode?: string;
  /** Patient-facing dosage directions (dosage_instruction[0].patient_instruction). CREATE only. */
  patientInstruction?: string;
  /** Number of refills permitted (dispense_number_of_repeats_allowed). Updatable. */
  dispenseRepeatsAllowed?: number;
  /** Dispense quantity value as string for input binding. Updatable. */
  dispenseQuantityValue?: string;
  /** Dispense quantity unit (e.g. "tablets"). Updatable. */
  dispenseQuantityUnit?: string;
  /** Whether generic substitution is allowed. Updatable. */
  substitutionAllowed?: boolean;
  /** Free-text note (note[0].text). Immutable child array — CREATE only. */
  note?: string;
}

/** Service request form item — AI suggestion plus doctor-selected status/intent/priority. */
export interface ServiceRequestFormItem extends AiServiceRequest {
  id: string;
  /** Numeric FHIR DB id — set when this item was loaded from an existing FHIR record. */
  fhirId?: number;
  resolved?: ResolvedConcept;
  status?: string;
  intent?: string;
  priority?: string;
  /** Service category code e.g. "108252007" (Laboratory). Immutable child array — CREATE only. */
  category?: string;
  /** ISO datetime for when the order should be performed. Updatable. */
  occurrenceDatetime?: string;
  /** Clinical indication / reason for ordering (reason_code[0].text). CREATE only. */
  reasonCode?: string;
  /** Instructions for the patient e.g. fasting (patient_instruction). Updatable. */
  patientInstruction?: string;
  /** Whether the order is PRN / as needed. Updatable. */
  asNeeded?: boolean;
  /** Free-text note (note[0].text). Immutable child array — CREATE only. */
  note?: string;
}

// ── Full staging report ────────────────────────────────────────────────────────

/** Full AI-generated staging report from the full-report-agent. */
export interface StagingReport {
  soap: SoapNote;
  assessment?: unknown;
  clinicalExtraction: {
    conditions: AiCondition[];
    observations: AiObservation[];
    medicationRequests: AiMedicationRequest[];
    serviceRequests: AiServiceRequest[];
  };
}

// ── FHIR enum fallbacks (used by ConceptSelect when the server call fails) ────

export const CONDITION_CLINICAL_STATUS = [
  { code: "active", display: "Active" },
  { code: "recurrence", display: "Recurrence" },
  { code: "relapse", display: "Relapse" },
  { code: "inactive", display: "Inactive" },
  { code: "remission", display: "Remission" },
  { code: "resolved", display: "Resolved" },
];

export const CONDITION_VERIFICATION_STATUS = [
  { code: "unconfirmed", display: "Unconfirmed" },
  { code: "provisional", display: "Provisional" },
  { code: "differential", display: "Differential" },
  { code: "confirmed", display: "Confirmed" },
  { code: "refuted", display: "Refuted" },
  { code: "entered-in-error", display: "Entered in Error" },
];

export const OBSERVATION_STATUS = [
  { code: "registered", display: "Registered" },
  { code: "preliminary", display: "Preliminary" },
  { code: "final", display: "Final" },
  { code: "amended", display: "Amended" },
  { code: "corrected", display: "Corrected" },
  { code: "cancelled", display: "Cancelled" },
  { code: "entered-in-error", display: "Entered in Error" },
  { code: "unknown", display: "Unknown" },
];

export const MEDICATION_REQUEST_STATUS = [
  { code: "active", display: "Active" },
  { code: "on-hold", display: "On Hold" },
  { code: "cancelled", display: "Cancelled" },
  { code: "completed", display: "Completed" },
  { code: "entered-in-error", display: "Entered in Error" },
  { code: "stopped", display: "Stopped" },
  { code: "draft", display: "Draft" },
  { code: "unknown", display: "Unknown" },
];

export const MEDICATION_REQUEST_INTENT = [
  { code: "proposal", display: "Proposal" },
  { code: "plan", display: "Plan" },
  { code: "order", display: "Order" },
  { code: "original-order", display: "Original Order" },
  { code: "reflex-order", display: "Reflex Order" },
  { code: "instance-order", display: "Instance Order" },
  { code: "option", display: "Option" },
];

export const SERVICE_REQUEST_STATUS = [
  { code: "active", display: "Active" },
  { code: "on-hold", display: "On Hold" },
  { code: "revoked", display: "Revoked" },
  { code: "completed", display: "Completed" },
  { code: "entered-in-error", display: "Entered in Error" },
  { code: "unknown", display: "Unknown" },
];

export const SERVICE_REQUEST_INTENT = [
  { code: "proposal", display: "Proposal" },
  { code: "plan", display: "Plan" },
  { code: "directive", display: "Directive" },
  { code: "order", display: "Order" },
  { code: "original-order", display: "Original Order" },
  { code: "reflex-order", display: "Reflex Order" },
  { code: "instance-order", display: "Instance Order" },
  { code: "option", display: "Option" },
];

export const SERVICE_REQUEST_PRIORITY = [
  { code: "routine", display: "Routine" },
  { code: "urgent", display: "Urgent" },
  { code: "asap", display: "ASAP" },
  { code: "stat", display: "Stat" },
];

