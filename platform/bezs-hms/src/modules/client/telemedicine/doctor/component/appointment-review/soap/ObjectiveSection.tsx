/**
 * ObjectiveSection — "O" accordion panel in the SOAP editor.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / soap
 *
 * Editable field: observations/vitals (EditableList of strings).
 * Changes propagate up to SoapEditor.
 */

"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { EditableList } from "../shared/EditableList";
import type { SoapNote } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ObjectiveSectionProps {
  /** Current objective data — controlled by parent SoapEditor. */
  data: SoapNote["objective"];
  /** Callback fired when observation list changes. */
  onChange: (data: SoapNote["objective"]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the Objective accordion item with an editable findings/vitals list.
 *
 * @param data - Current objective state.
 * @param onChange - Setter for the full objective object.
 */
export function ObjectiveSection({ data, onChange }: ObjectiveSectionProps) {
  return (
    <AccordionItem value="objective" className="border rounded-lg px-4">
      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
        Objective
      </AccordionTrigger>
      <AccordionContent className="space-y-2 pb-4">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Findings &amp; Vitals
        </Label>
        <EditableList
          items={data.observations}
          onChange={(items) => onChange({ observations: items })}
          placeholder="e.g. Temperature: 101.2 F"
          addLabel="Add finding"
        />
      </AccordionContent>
    </AccordionItem>
  );
}
