/**
 * reExtract — re-runs the AI clinical-extraction agent against a SOAP note.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * The agent reads the note and returns the four clinical resource lists it can
 * infer from it. Used when the doctor has edited the note and wants the
 * structured entries regenerated to match.
 *
 * The request shape and result type live here rather than inside
 * ClinicalExtractionPanel so the review page and the Clinical Records workspace
 * share one implementation.
 *
 * **This replaces, it does not merge.** Entries already published carry a
 * `fhirId`; the regenerated ones do not, so publishing after a re-extract
 * deletes the originals and creates fresh records. Callers should warn before
 * running it over published entries — see `countPublished`.
 */

import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
  SoapNote,
} from "../appointment-review/types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape returned by /api/clinical-extraction-agent. */
export interface ClinicalExtractionResult {
  conditions: Array<{ display: string; terminologySystem: string }>;
  observations: Array<{
    display: string;
    terminologySystem: string;
    value?: string | null;
    unit?: string | null;
  }>;
  medicationRequests: Array<{
    display: string;
    terminologySystem: string;
    dose?: string | null;
    frequency?: string | null;
    duration?: string | null;
    route?: string | null;
  }>;
  serviceRequests: Array<{ display: string; terminologySystem: string }>;
}

/** The four regenerated lists, already mapped to form items. */
export interface ReExtractedEntries {
  conditions: ConditionFormItem[];
  observations: ObservationFormItem[];
  medications: MedicationFormItem[];
  serviceRequests: ServiceRequestFormItem[];
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Calls the clinical-extraction agent with the current SOAP note.
 *
 * @param soap - The note to extract from.
 * @param assessment - Optional raw AI assessment for extra context.
 * @returns The agent's four resource lists.
 * @throws Error when the request fails, with the upstream status and body.
 */
export async function fetchClinicalExtraction(
  soap: SoapNote,
  assessment?: unknown,
): Promise<ClinicalExtractionResult> {
  const res = await fetch("/api/clinical-extraction-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ soap, assessment: assessment ?? null }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Clinical extraction failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Mapping ───────────────────────────────────────────────────────────────────

/**
 * Maps an extraction result to form items.
 *
 * Items get a fresh `id` and **no** `fhirId` — they are new as far as the
 * publish diff is concerned, which is what makes a re-extract replace rather
 * than update.
 *
 * @param result - Raw agent output.
 * @returns The four lists as form items.
 */
export function toFormItems(result: ClinicalExtractionResult): ReExtractedEntries {
  return {
    conditions: result.conditions.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
    })),
    observations: result.observations.map((o) => ({
      ...o,
      id: crypto.randomUUID(),
      value: o.value ?? null,
      unit: o.unit ?? null,
    })),
    medications: result.medicationRequests.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      dose: m.dose ?? null,
      frequency: m.frequency ?? null,
      duration: m.duration ?? null,
      route: m.route ?? null,
    })),
    serviceRequests: result.serviceRequests.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
    })),
  };
}

// ── Safety ────────────────────────────────────────────────────────────────────

/**
 * Counts entries that already exist in the EMR across all four lists.
 *
 * A re-extract discards these, so publishing afterwards deletes the originals
 * and creates replacements. Callers use this to decide whether to confirm first.
 *
 * @param lists - The current entry lists.
 * @returns How many entries carry a fhirId.
 */
export function countPublished(lists: {
  conditions: ConditionFormItem[];
  observations: ObservationFormItem[];
  medications: MedicationFormItem[];
  serviceRequests: ServiceRequestFormItem[];
}): number {
  return (
    lists.conditions.filter((i) => i.fhirId != null).length +
    lists.observations.filter((i) => i.fhirId != null).length +
    lists.medications.filter((i) => i.fhirId != null).length +
    lists.serviceRequests.filter((i) => i.fhirId != null).length
  );
}
