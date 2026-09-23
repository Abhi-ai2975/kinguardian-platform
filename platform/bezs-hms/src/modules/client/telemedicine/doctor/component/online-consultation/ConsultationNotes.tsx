/**
 * ConsultationNotes — free-text note pad for the doctor during a live consultation.
 *
 * Layer: client / telemedicine / doctor / component / online-consultation
 *
 * Rendered inside DoctorConsult below the video room. The parent owns the
 * `notes` string and passes it back via `onNotesChange` so the end-call
 * handler can read the latest value through a ref without stale closures.
 *
 * Notes are appended to the conversation array as "DOCTOR NOTES: <text>"
 * before the full-report-agent call so the AI has context from the doctor.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationNotesProps {
  /** Current notes value — controlled by DoctorConsult. */
  notes: string;
  /** Called on every keystroke to keep the parent state current. */
  onNotesChange: (value: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Controlled notes textarea rendered below the video room.
 * Stateless — the parent (DoctorConsult) manages state via a ref so the
 * end-call handler always reads the latest text without stale closures.
 *
 * @param notes - Current notes string.
 * @param onNotesChange - Parent setter called on every change.
 */
export function ConsultationNotes({ notes, onNotesChange }: ConsultationNotesProps) {
  return (
    <Card className="mt-2 p-3 flex flex-col gap-2 h-[200px] bg-secondary shrink-0">
      <h3 className="text-sm font-medium text-muted-foreground">
        Consultation Notes
      </h3>
      <Textarea
        placeholder="Write important points, observations, prescriptions..."
        className="flex-1 resize-none text-sm"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
      />
    </Card>
  );
}
