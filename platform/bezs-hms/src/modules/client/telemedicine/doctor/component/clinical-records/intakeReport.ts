/**
 * intakeReport — shared typing and parsing for the AI pre-intake report.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * The intake report arrives in more than one shape depending on how it was
 * written: a plain object, a JSON string, or wrapped in a
 * `{ status, data: { … } }` envelope from the assessment-plan-agent API. That
 * unwrapping is fiddly and easy to get subtly wrong, so it lives here and is
 * imported by both consumers — the Clinical Records intake tab and the older
 * IntakeReportSection on the appointment detail page.
 *
 * Every field is optional: the agent omits sections it has nothing to say about.
 */

// ── Report shapes ─────────────────────────────────────────────────────────────

/** A single differential diagnosis entry from the AI assessment agent. */
export interface DifferentialItem {
  condition?: string;
  rationale?: string;
  likelihood?: string;
}

/**
 * A diagnostic test or study.
 * Used in `diagnostic_plan.laboratory_tests`, `.imaging` and `.other` — the
 * agent names the entry `test` in some sections and `study` in others.
 */
export interface DiagnosticItem {
  test?: string;
  study?: string;
  purpose?: string;
}

/** A single treatment recommendation from the AI assessment agent. */
export interface TreatmentItem {
  condition?: string;
  recommendation?: string;
  rationale?: string;
  route?: string;
  duration?: string;
}

/** Typed representation of the AI clinical report JSON. */
export interface IntakeReport {
  clinical_overview?: string;
  risk_level?: string;
  differential_diagnosis?: DifferentialItem[];
  diagnostic_plan?: {
    laboratory_tests?: DiagnosticItem[];
    imaging?: DiagnosticItem[];
    other?: DiagnosticItem[];
  };
  treatment_plan?: TreatmentItem[];
  procedures?: string;
  red_flags?: string[];
}

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * Safely parses the intake report field.
 *
 * Accepts a JSON string, a plain object, or a `{ status, data }` envelope from
 * the assessment-plan-agent, and returns the report itself.
 *
 * @param raw - Raw report value from the Intake record.
 * @returns Typed IntakeReport, or null when the value cannot be parsed.
 */
export function safeParseReport(raw: unknown): IntakeReport | null {
  if (raw == null) return null;
  try {
    const obj: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (typeof obj !== "object" || Array.isArray(obj) || obj === null) return null;

    const envelope = obj as Record<string, unknown>;
    /* Unwrap the { status, data: { … } } envelope from the agent API. */
    if (
      envelope.data &&
      typeof envelope.data === "object" &&
      !Array.isArray(envelope.data)
    ) {
      return envelope.data as IntakeReport;
    }
    return obj as IntakeReport;
  } catch {
    return null;
  }
}

// ── Presentation helpers ──────────────────────────────────────────────────────

/**
 * Maps a risk level to Tailwind classes for its badge.
 *
 * @param level - Risk level string from the agent (case-insensitive).
 * @returns Combined Tailwind class string.
 */
export function riskBadgeClass(level?: string): string {
  switch (level?.toUpperCase()) {
    case "HIGH":
      return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-900";
    case "MODERATE":
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900";
    case "LOW":
      return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-900";
    default:
      return "";
  }
}

/**
 * Reads a diagnostic entry's name, which the agent labels `test` in some
 * sections and `study` in others.
 *
 * @param item - Diagnostic plan entry.
 * @returns The entry's name, or null when neither key is present.
 */
export function diagnosticName(item: DiagnosticItem): string | null {
  return item.test ?? item.study ?? null;
}

/**
 * Last-resort readable text for a report entry whose keys no renderer knows.
 *
 * Joins the entry's own string values. The point is to never reach for
 * `String(entry)` or `JSON.stringify(entry)`, which is how "[object Object]"
 * and raw JSON ended up rendered into clinical panels.
 *
 * @param item - An unrecognised report entry.
 * @returns Readable text, falling back to a JSON dump only when the entry
 *          holds no strings at all.
 */
export function readableFallback(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const text = Object.values(item as Record<string, unknown>)
      .filter((v): v is string => typeof v === "string")
      .join(" — ");
    return text || JSON.stringify(item);
  }
  return String(item);
}

/**
 * Flattens a diagnostic plan's three sub-arrays into one ordered list.
 *
 * Labs first, then imaging, then everything else — the order a clinician reads
 * a workup in. Shared so the two report renderers cannot drift on either the
 * ordering or the set of keys they know about.
 *
 * @param plan - The report's `diagnostic_plan`, which may be absent.
 * @returns Every diagnostic entry in display order; empty when there are none.
 */
export function flattenDiagnosticPlan(
  plan: IntakeReport["diagnostic_plan"],
): DiagnosticItem[] {
  return [
    ...(plan?.laboratory_tests ?? []),
    ...(plan?.imaging ?? []),
    ...(plan?.other ?? []),
  ];
}
