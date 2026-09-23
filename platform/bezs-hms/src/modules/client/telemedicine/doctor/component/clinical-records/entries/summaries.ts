/**
 * summaries — one-line descriptions of a clinical entry for its list row.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * The entry list shows a compact row per item; the full field set lives in the
 * drawer. These formatters produce the secondary line under each row title —
 * the handful of values a doctor scans to recognise an entry without opening it
 * ("1 tab · TID · 7 days · oral").
 *
 * Every formatter tolerates a completely empty item, since rows exist from the
 * moment the doctor clicks Add and before anything is filled in.
 */

import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
} from "../../appointment-review/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Joins the non-empty parts of a summary with a middot separator.
 *
 * @param parts - Candidate fragments, any of which may be empty.
 * @returns The joined summary, or an empty string when nothing is set.
 */
function join(parts: (string | null | undefined)[]): string {
  return parts.filter((p) => p && p.trim().length > 0).join(" · ");
}

/**
 * Prefers a doctor's edit over the original AI/FHIR value.
 *
 * @param edited - Doctor-edited value, if any.
 * @param original - Original value.
 * @returns Whichever value should be displayed.
 */
function effective(
  edited: string | undefined,
  original: string | null | undefined,
): string | null {
  return edited ?? original ?? null;
}

/** Turns a code like "entered-in-error" into "Entered in error" for display. */
function humanise(code: string | undefined): string | null {
  if (!code) return null;
  const spaced = code.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ── Per-resource formatters ───────────────────────────────────────────────────

/**
 * Summary line for a Condition row — clinical and verification status.
 *
 * @param item - The condition entry.
 * @returns e.g. "Active · Confirmed · Severe".
 */
export function conditionSummary(item: ConditionFormItem): string {
  return join([
    humanise(item.clinicalStatus),
    humanise(item.verificationStatus),
    humanise(item.severity),
  ]);
}

/**
 * Summary line for an Observation row — the measured value and status.
 *
 * @param item - The observation entry.
 * @returns e.g. "38.4 °C · Final · High".
 */
export function observationSummary(item: ObservationFormItem): string {
  const value = item.editedValue ?? item.value ?? null;
  const unit = item.editedUnit ?? item.unit ?? null;
  const measured = value ? `${value}${unit ? ` ${unit}` : ""}` : null;
  return join([measured, humanise(item.status), humanise(item.interpretation)]);
}

/**
 * Summary line for a MedicationRequest row — the dosage sig.
 *
 * @param item - The medication entry.
 * @returns e.g. "500 mg · TID · 7 days · Oral".
 */
export function medicationSummary(item: MedicationFormItem): string {
  return join([
    effective(item.editedDose, item.dose),
    effective(item.editedFrequency, item.frequency),
    effective(item.editedDuration, item.duration),
    effective(item.editedRoute, item.route),
  ]);
}

/**
 * Summary line for a ServiceRequest row — status, priority and timing.
 *
 * @param item - The order entry.
 * @returns e.g. "Active · Urgent · As needed".
 */
export function serviceRequestSummary(item: ServiceRequestFormItem): string {
  const occurrence = item.occurrenceDatetime
    ? (() => {
        try {
          return new Date(item.occurrenceDatetime!).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          });
        } catch {
          return null;
        }
      })()
    : null;

  return join([
    humanise(item.status),
    humanise(item.priority),
    occurrence,
    item.asNeeded ? "As needed" : null,
  ]);
}
