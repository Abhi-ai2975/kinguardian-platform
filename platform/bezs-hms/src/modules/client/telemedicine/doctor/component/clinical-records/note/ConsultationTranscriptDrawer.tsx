/**
 * ConsultationTranscriptDrawer — the live call transcript, beside the note.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / note
 *
 * The transcript is the source the consultation note is written from, so it
 * belongs next to the note rather than three tabs away under Intake, where
 * checking a line meant leaving the note to find it and losing your place.
 *
 * A drawer rather than an inline panel: it is reference material consulted
 * while reading, not part of the document. Opening it leaves the note on
 * screen underneath and closing it returns you exactly where you were.
 */

"use client";

import { MessageSquare } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TranscriptTurn } from "../TranscriptTurn";
import type { TConsultationTranscriptMessage } from "@/modules/entities/schemas/consultation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationTranscriptDrawerProps {
  /** Whether the drawer is open. */
  open: boolean;
  /** Called when the drawer requests to close. */
  onOpenChange: (open: boolean) => void;
  /** Turns captured during the call, in order. */
  transcript: TConsultationTranscriptMessage[];
  /** Patient name, shown in the drawer subtitle for context. */
  patientName: string;
  /** Formatted visit date, shown in the drawer subtitle. */
  appointmentDate: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Side drawer listing the consultation transcript.
 *
 * @param open - Whether the drawer is open.
 * @param onOpenChange - Open-state change handler.
 * @param transcript - Turns captured during the call.
 * @param patientName - Patient name for the subtitle.
 * @param appointmentDate - Visit date for the subtitle.
 */
export function ConsultationTranscriptDrawer({
  open,
  onOpenChange,
  transcript,
  patientName,
  appointmentDate,
}: ConsultationTranscriptDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-primary" />
            Consultation conversation
          </SheetTitle>
          <SheetDescription className="text-xs">
            {[patientName, appointmentDate].filter(Boolean).join(" · ") ||
              "Transcript captured during the call"}
          </SheetDescription>
        </SheetHeader>

        {transcript.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-center text-sm text-muted-foreground">
              No consultation transcript was captured for this visit.
            </p>
          </div>
        ) : (
          /* min-h-0 is load-bearing: a flex child's default min-height is
             auto, which lets it grow to fit its content instead of shrinking
             to the space the flex column actually has — so it pushes past
             the sheet's fixed height rather than scrolling within it. That's
             also why the old ScrollArea here never scrolled; wrapping the
             overflow in a component doesn't fix a sizing problem one level up. */
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 px-5 py-4">
              {transcript.map((m, i) => (
                <TranscriptTurn
                  key={i}
                  speaker={m.speaker === "DOCTOR" ? "Doctor" : "Patient"}
                  text={m.text}
                  timestamp={m.timestamp}
                  isClinician={m.speaker === "DOCTOR"}
                />
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
