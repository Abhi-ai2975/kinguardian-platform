/**
 * TranscriptTurn — one speaker turn in a conversation transcript.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Shared by the two transcripts a visit can produce: the patient↔AI intake
 * dialogue on the Intake tab, and the live consultation transcript in the
 * drawer behind the consultation note. Both render identically so a doctor
 * reads them the same way.
 */

"use client";

import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TranscriptTurnProps {
  /** Who spoke, already resolved to a display label. */
  speaker: string;
  /** What they said. */
  text: string;
  /** Formatted time, when the source captured one. */
  timestamp?: string;
  /**
   * Whether this turn is the clinician side (doctor, or the AI acting as
   * interviewer). Tints the speaker label so the two sides are scannable.
   */
  isClinician: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A single labelled turn of dialogue.
 *
 * @param speaker - Display label for the speaker.
 * @param text - Turn content.
 * @param timestamp - Optional formatted time.
 * @param isClinician - Tints clinician turns differently.
 */
export function TranscriptTurn({
  speaker,
  text,
  timestamp,
  isClinician,
}: TranscriptTurnProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-xs font-semibold",
            isClinician ? "text-primary" : "text-muted-foreground",
          )}
        >
          {speaker}
        </span>
        {timestamp && (
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {timestamp}
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  );
}
