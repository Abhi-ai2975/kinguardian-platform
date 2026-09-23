/**
 * SoapEditor — accordion wrapper for the four SOAP note sections.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / soap
 *
 * Renders Subjective, Objective, Assessment, and Plan sections as a multi-open
 * Accordion. All sections start expanded. State is owned by the parent
 * (AppointmentReview) which passes soap + onChange.
 */

"use client";

import { Accordion } from "@/components/ui/accordion";
import { SubjectiveSection } from "./SubjectiveSection";
import { ObjectiveSection } from "./ObjectiveSection";
import { AssessmentSection } from "./AssessmentSection";
import { PlanSection } from "./PlanSection";
import type { SoapNote } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SoapEditorProps {
  /** Current SOAP note — controlled by AppointmentReview. */
  soap: SoapNote;
  /** Called whenever any section field changes with the full updated SoapNote. */
  onChange: (soap: SoapNote) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full SOAP note editor — four accordions, all open by default.
 * Delegates field editing to section sub-components and merges updates upward.
 *
 * @param soap - Full SOAP note object.
 * @param onChange - Parent setter receiving the full updated SOAP note.
 */
export function SoapEditor({ soap, onChange }: SoapEditorProps) {
  return (
    <Accordion
      type="multiple"
      defaultValue={["subjective", "objective", "assessment", "plan"]}
      className="space-y-2"
    >
      <SubjectiveSection
        data={soap.subjective}
        onChange={(val) => onChange({ ...soap, subjective: val })}
      />
      <ObjectiveSection
        data={soap.objective}
        onChange={(val) => onChange({ ...soap, objective: val })}
      />
      <AssessmentSection
        data={soap.assessment}
        onChange={(val) => onChange({ ...soap, assessment: val })}
      />
      <PlanSection
        data={soap.plan}
        summary={soap.summary}
        onPlanChange={(val) => onChange({ ...soap, plan: val })}
        onSummaryChange={(val) => onChange({ ...soap, summary: val })}
      />
    </Accordion>
  );
}
