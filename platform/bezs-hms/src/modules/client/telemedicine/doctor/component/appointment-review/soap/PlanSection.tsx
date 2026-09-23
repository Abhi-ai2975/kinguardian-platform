/**
 * PlanSection — "P" accordion panel in the SOAP editor.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / soap
 *
 * Editable fields: next steps (EditableList), when to seek care (Input),
 * and clinical summary (Textarea). The summary field lives at the root of SoapNote
 * so it receives a separate setter prop.
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

interface PlanSectionProps {
  /** Current plan data — controlled by parent SoapEditor. */
  data: SoapNote["plan"];
  /** Root-level SOAP summary string. */
  summary: string;
  /** Setter for the plan object. */
  onPlanChange: (data: SoapNote["plan"]) => void;
  /** Setter for the root summary string. */
  onSummaryChange: (val: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the Plan & Summary accordion item with next-steps list, when-to-seek-care
 * input, and a clinical summary textarea.
 *
 * @param data - Current plan state.
 * @param summary - Root-level SOAP summary string.
 * @param onPlanChange - Setter for the plan object.
 * @param onSummaryChange - Setter for the summary string.
 */
export function PlanSection({
  data,
  summary,
  onPlanChange,
  onSummaryChange,
}: PlanSectionProps) {
  return (
    <AccordionItem value="plan" className="border rounded-lg px-4">
      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
        Plan &amp; Summary
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Next Steps
          </Label>
          <EditableList
            items={data.next_steps}
            onChange={(items) => onPlanChange({ ...data, next_steps: items })}
            placeholder="Step..."
            addLabel="Add step"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            When to Seek Care
          </Label>
          <Input
            value={data.when_to_seek_care}
            onChange={(e) =>
              onPlanChange({ ...data, when_to_seek_care: e.target.value })
            }
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Clinical Summary
          </Label>
          <Textarea
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            className="text-sm min-h-[100px] resize-none"
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
