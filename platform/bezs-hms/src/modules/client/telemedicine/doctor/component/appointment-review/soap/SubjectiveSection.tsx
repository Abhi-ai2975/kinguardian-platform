/**
 * SubjectiveSection — "S" accordion panel in the SOAP editor.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / soap
 *
 * Editable fields: chief complaint (Input), history of present illness (Textarea),
 * associated symptoms (EditableList). All changes propagate up to SoapEditor.
 */

"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditableList } from "../shared/EditableList";
import type { SoapNote } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubjectiveSectionProps {
  /** Current subjective data — controlled by parent SoapEditor. */
  data: SoapNote["subjective"];
  /** Callback fired on any field change. */
  onChange: (data: SoapNote["subjective"]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the Subjective accordion item with chief complaint, HPI, and symptoms.
 *
 * @param data - Current subjective state.
 * @param onChange - Setter for the full subjective object.
 */
export function SubjectiveSection({ data, onChange }: SubjectiveSectionProps) {
  return (
    <AccordionItem value="subjective" className="border rounded-lg px-4">
      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
        Subjective
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Chief Complaint
          </Label>
          <Input
            value={data.chief_complaint}
            onChange={(e) => onChange({ ...data, chief_complaint: e.target.value })}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            History of Present Illness
          </Label>
          <Textarea
            value={data.history_of_present_illness}
            onChange={(e) =>
              onChange({ ...data, history_of_present_illness: e.target.value })
            }
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Associated Symptoms
          </Label>
          <EditableList
            items={data.associated_symptoms}
            onChange={(items) => onChange({ ...data, associated_symptoms: items })}
            placeholder="Symptom..."
            addLabel="Add symptom"
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
