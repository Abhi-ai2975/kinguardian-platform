/**
 * IntakeReportFields — shared renderers for AI clinical report sections.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * The assessment-plan agent produces the same report shape in two places: the
 * pre-appointment intake (`Intake.report`) and the post-consultation full
 * report (`Consultation.full_report.assessment_plan` — see the schema comment
 * on FullConsultationReportSchema, "Same shape as the intake assessment plan").
 *
 * Every section of that report is a list of *objects*, not strings:
 *   differential_diagnosis  { condition, rationale, likelihood }
 *   diagnostic_plan         { laboratory_tests, imaging, other } of
 *                           { test | study, purpose }
 *   treatment_plan          { condition, recommendation, route, duration }
 *
 * Each consumer that re-derived this independently got it wrong in the same
 * way — calling String() or JSON.stringify() on an entry and rendering
 * "[object Object]" or raw JSON into a clinical panel — so the renderers live
 * here once. The types and parsing they build on are in intakeReport.ts.
 *
 * Presentation only: no hooks, no state, no fetching.
 */

"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  diagnosticName,
  flattenDiagnosticPlan,
  readableFallback,
  type DifferentialItem,
  type IntakeReport,
  type TreatmentItem,
} from "./intakeReport";

/**
 * Renders the differential diagnosis.
 *
 * Entries are `{ condition, rationale, likelihood }` objects. A plain string
 * entry is still accepted — the agent's shape varies with the prompt, which is
 * why the schema types these `unknown`.
 *
 * @param items - The report's raw `differential_diagnosis`.
 */
export function DifferentialDiagnosisList({ items }: { items: unknown }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((raw, i) => {
        if (typeof raw === "string") {
          return (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">·</span>
              {raw}
            </li>
          );
        }
        if (!raw || typeof raw !== "object") return null;

        const d = raw as DifferentialItem;
        /* Nothing this renderer knows about — show the entry's own strings
           rather than dropping it or dumping JSON. */
        if (!d.condition && !d.rationale && !d.likelihood) {
          return (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">·</span>
              {readableFallback(raw)}
            </li>
          );
        }

        return (
          <li
            key={i}
            className="text-sm border-l-2 border-primary/20 pl-2 space-y-0.5"
          >
            {d.condition && (
              <p className="font-medium text-foreground">{d.condition}</p>
            )}
            {d.rationale && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {d.rationale}
              </p>
            )}
            {d.likelihood && (
              <Badge variant="outline" className="text-[10px] w-fit font-normal">
                {d.likelihood}
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Renders the diagnostic plan, flattened labs → imaging → other.
 *
 * @param value - The report's raw `diagnostic_plan`.
 */
export function DiagnosticPlanField({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return <p className="text-sm leading-relaxed">{value}</p>;
  }

  const items = flattenDiagnosticPlan(value as IntakeReport["diagnostic_plan"]);
  if (items.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => {
        const name = diagnosticName(item);
        return (
          <li key={i} className="text-sm flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">·</span>
            <span className="space-y-0.5">
              <span className="block font-medium">
                {name ?? readableFallback(item)}
              </span>
              {/* Suppressed when the name already fell back to the entry's
                  strings, which would otherwise repeat the purpose. */}
              {item.purpose && name && (
                <span className="block text-xs text-muted-foreground">
                  {item.purpose}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Renders the treatment plan.
 *
 * @param value - The report's raw `treatment_plan`, an array of recommendations.
 */
export function TreatmentPlanField({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return <p className="text-sm leading-relaxed">{value}</p>;
  }
  if (!Array.isArray(value) || value.length === 0) return null;

  const items = value as TreatmentItem[];
  return (
    <div className="space-y-2">
      {items.map((t, i) => {
        const known = t.condition ?? t.recommendation ?? t.route ?? t.duration;
        return (
          <div key={i} className="border-l-2 border-primary/20 pl-2 space-y-0.5">
            {t.condition && (
              <p className="text-xs text-muted-foreground">{t.condition}</p>
            )}
            {t.recommendation && (
              <p className="text-sm text-foreground">{t.recommendation}</p>
            )}
            {(t.route ?? t.duration) && (
              <p className="text-xs text-muted-foreground">
                {[t.route && `Route: ${t.route}`, t.duration]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {!known && (
              <p className="text-sm text-muted-foreground">
                {readableFallback(t)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Renders the red-flag list.
 *
 * Entries are usually plain strings but the agent sometimes emits objects, and
 * it emits the sentinel "Not reported" for an empty section — filtered out here
 * so the heading does not appear above a non-finding.
 *
 * @param items - The report's raw `red_flags`.
 * @param showHeading - Whether to render the section heading (callers with
 *                      their own section chrome pass false).
 */
export function RedFlagList({
  items,
  showHeading = true,
}: {
  items: unknown;
  showHeading?: boolean;
}) {
  if (!Array.isArray(items)) return null;

  const flags = items
    .filter((f) => f != null && f !== "Not reported")
    .map((f) => (typeof f === "string" ? f : readableFallback(f)));

  if (flags.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {showHeading && (
        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
          <AlertTriangle className="size-3" />
          Red Flags
        </p>
      )}
      <ul className="space-y-1">
        {flags.map((flag, i) => (
          <li key={i} className="text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
            {flag}
          </li>
        ))}
      </ul>
    </div>
  );
}
