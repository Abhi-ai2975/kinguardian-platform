/**
 * AssessmentSection — "A" accordion panel in the SOAP editor.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / soap
 *
 * Editable fields: possible conditions (EditableList) and clinical reasoning (Textarea).
 * Changes propagate up to SoapEditor.
 */

"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditableList } from "../shared/EditableList";
import type { SoapNote } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssessmentSectionProps {
  /** Current assessment data — controlled by parent SoapEditor. */
  data: SoapNote["assessment"];
  /** Callback fired on any field change. */
  onChange: (data: SoapNote["assessment"]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the Assessment accordion item with possible conditions list and reasoning textarea.
 *
 * @param data - Current assessment state.
 * @param onChange - Setter for the full assessment object.
 */
export function AssessmentSection({ data, onChange }: AssessmentSectionProps) {
  return (
    <AccordionItem value="assessment" className="border rounded-lg px-4">
      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
        Assessment
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Possible Conditions
          </Label>
          <EditableList
            items={data.possible_conditions}
            onChange={(items) => onChange({ ...data, possible_conditions: items })}
            placeholder="Condition..."
            addLabel="Add condition"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Clinical Reasoning
          </Label>
          <Textarea
            value={data.clinical_reasoning}
            onChange={(e) =>
              onChange({ ...data, clinical_reasoning: e.target.value })
            }
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
