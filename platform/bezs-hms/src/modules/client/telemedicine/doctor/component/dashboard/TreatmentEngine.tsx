/**
 * TreatmentEngine — AI-derived treatment recommendation card for the doctor dashboard.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Reads from the consultation's full_report.assessment_plan and surfaces:
 *   - Likely conditions (badges)
 *   - Differential diagnosis (bulleted list)
 *   - Recommended tests (list with info icon)
 *   - Treatment pathway / plan (ordered steps)
 *   - Precaution alerts (yellow warning boxes)
 *
 * Mirrors drgodly-mvp TreatmentEngine.tsx in layout and content.
 * Accepts the raw assessment_plan object — tolerates any unknown agent shape
 * using loose field extraction.
 */

"use client";

import { AlertTriangle, FlaskConical, Info, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TreatmentEngineProps {
  /**
   * Raw assessment_plan from consultation.full_report.assessment_plan.
   * Shape is agent-controlled — we extract fields defensively.
   */
  assessmentPlan: Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Safely coerces an unknown value to string, or returns null. */
function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

/**
 * Coerces an unknown value to a string array.
 * Handles: string[], object[] (stringifies), string (splits on newline / comma).
 */
function strArr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        // Common agent shapes: { condition, rationale } or { name, description }
        const o = item as Record<string, unknown>;
        return str(o.condition ?? o.name ?? o.description ?? o.text) ?? JSON.stringify(item);
      }
      return String(item);
    });
  }
  if (typeof v === "string") {
    // Newline-separated or comma-separated
    return v
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the AI treatment & recommendation engine card.
 * Returns null if the assessment_plan contains no displayable data.
 *
 * @param assessmentPlan - Raw assessment_plan from consultation full_report.
 */
export function TreatmentEngine({ assessmentPlan }: TreatmentEngineProps) {
  const likely = strArr(assessmentPlan.likely_conditions ?? assessmentPlan.possible_conditions);
  const differential = strArr(assessmentPlan.differential_diagnosis);
  const tests = strArr(
    assessmentPlan.recommended_tests ??
      (assessmentPlan.diagnostic_plan as Record<string, unknown>)?.tests ??
      assessmentPlan.diagnostic_plan,
  );
  const treatmentSteps = strArr(
    assessmentPlan.treatment_pathway ??
      assessmentPlan.treatment_steps ??
      assessmentPlan.treatment_plan,
  );
  const precautions = strArr(
    assessmentPlan.precautions ??
      assessmentPlan.precaution_alerts ??
      assessmentPlan.red_flags,
  );

  // Nothing to show
  const hasContent =
    likely.length > 0 ||
    differential.length > 0 ||
    tests.length > 0 ||
    treatmentSteps.length > 0 ||
    precautions.length > 0;

  if (!hasContent) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="size-4 text-muted-foreground" />
          Treatment Engine
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 text-sm">
        {/* Likely conditions */}
        {likely.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Likely Conditions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {likely.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Differential diagnosis */}
        {differential.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Differential Diagnosis
            </p>
            <ul className="space-y-1">
              {differential.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-bold mt-0.5 shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended tests */}
        {tests.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <FlaskConical className="size-3" />
              Recommended Tests
            </p>
            <ul className="space-y-1">
              {tests.map((test, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
                  {test}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Treatment pathway */}
        {treatmentSteps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Treatment Pathway
            </p>
            <ol className="space-y-1 list-decimal list-inside">
              {treatmentSteps.map((step, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Precautions / red flags */}
        {precautions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="size-3" />
              Precautions
            </p>
            <div className="space-y-1.5">
              {precautions.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
                >
                  <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
