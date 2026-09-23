/**
 * ConsultationNoteCanvas — the SOAP note as a clinical document.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / note
 *
 * Replaces the review page's SoapEditor (four accordions of labelled inputs)
 * with something a doctor recognises as a note: a letterhead, S/O/A/P headings,
 * and prose. Every block is click-to-edit, so it reads as a document until you
 * touch it.
 *
 * Because it renders as a document rather than a form, it prints correctly with
 * no separate view — `print:` utilities drop the app chrome, matching the
 * approach already used for the prescription sheet.
 *
 * Fully controlled: each commit sends the whole updated SoapNote up so the
 * workspace's staging autosave sees it.
 */

"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileCode,
  FileText,
  FileType,
  Loader2,
  MessageSquare,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { EditableList } from "../../appointment-review/shared/EditableList";
import type { SoapNote } from "../../appointment-review/types";
import { EditableBlock } from "./EditableBlock";
import { ConsultationTranscriptDrawer } from "./ConsultationTranscriptDrawer";
import { downloadNote, type NoteExportFormat } from "./exportNote";
import type { TConsultationTranscriptMessage } from "@/modules/entities/schemas/consultation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationNoteCanvasProps {
  /** Current SOAP note — controlled by the workspace. */
  soap: SoapNote;
  /**
   * Called with the full updated note on any commit.
   * Not called at all when `readOnly` is set.
   */
  onChange?: (soap: SoapNote) => void;
  /**
   * Renders the note as a finished document with no editing affordances.
   *
   * The Clinical Records workspace uses this: the note there is a record of
   * what the doctor approved, and the review page is the one place it is
   * written. Editing in both would leave edits staged on a surface that cannot
   * publish them.
   */
  readOnly?: boolean;
  /**
   * Whether the doctor has approved this note.
   *
   * Only affects the downloads: an unapproved note carries a DRAFT line in the
   * exported file. Once it leaves the app there is no badge and no banner, so
   * the warning has to travel inside the document itself.
   */
  reviewed?: boolean;
  /**
   * Live consultation transcript, if the visit had a call.
   *
   * Lives with the note because it is the source the note was written from —
   * checking a line against what was actually said should not mean leaving the
   * note. Omit or pass an empty array to hide the button entirely.
   */
  transcript?: TConsultationTranscriptMessage[];
  /** Patient name for the letterhead. */
  patientName: string;
  /** Doctor name for the letterhead. */
  doctorName: string;
  /** Formatted visit date for the letterhead. */
  appointmentDate: string | null;
}

// ── Section shell ─────────────────────────────────────────────────────────────

/**
 * One lettered section of the note (S, O, A, P).
 *
 * @param letter - Section initial shown in the margin.
 * @param title - Section name.
 * @param children - Section content.
 */
function NoteSection({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-4">
      {/* Margin initial — gives the note its documentary rhythm */}
      <div
        aria-hidden
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground print:border-0"
      >
        {letter}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {children}
      </div>
    </section>
  );
}

/**
 * A labelled sub-part within a section.
 *
 * @param label - Field name.
 * @param children - Field content.
 */
function NoteField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Editable SOAP note rendered as a continuous clinical document.
 *
 * @param props - See ConsultationNoteCanvasProps.
 */
export function ConsultationNoteCanvas({
  soap,
  onChange,
  readOnly = false,
  reviewed = true,
  transcript = [],
  patientName,
  doctorName,
  appointmentDate,
}: ConsultationNoteCanvasProps) {
  /**
   * Applies a patch to one SOAP section and pushes the whole note upward.
   * A no-op without onChange, which is the read-only case — the fields do not
   * render an edit affordance there, so these are unreachable anyway.
   */
  const setSubjective = (patch: Partial<SoapNote["subjective"]>) =>
    onChange?.({ ...soap, subjective: { ...soap.subjective, ...patch } });
  const setObjective = (patch: Partial<SoapNote["objective"]>) =>
    onChange?.({ ...soap, objective: { ...soap.objective, ...patch } });
  const setAssessment = (patch: Partial<SoapNote["assessment"]>) =>
    onChange?.({ ...soap, assessment: { ...soap.assessment, ...patch } });
  const setPlan = (patch: Partial<SoapNote["plan"]>) =>
    onChange?.({ ...soap, plan: { ...soap.plan, ...patch } });

  /* Only the PDF path is async — jsPDF is imported on demand, so the button
     holds a spinner rather than appearing dead on a slow first load. */
  const [isExporting, setIsExporting] = useState(false);

  /** Whether the consultation transcript drawer is open. */
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  /**
   * Downloads the note in the chosen format.
   *
   * @param format - "pdf", "word" or "text".
   */
  async function handleDownload(format: NoteExportFormat) {
    setIsExporting(true);
    try {
      await downloadNote(format, soap, {
        patientName,
        doctorName,
        appointmentDate,
        reviewed,
      });
    } catch (err) {
      console.error("[ConsultationNoteCanvas] export failed:", err);
      toast.error("Could not generate the file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardContent className="space-y-6 px-6 py-5 print:px-0">
        {/* ── Letterhead ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">
              Consultation Note
            </h2>
            <p className="text-xs text-muted-foreground">
              {[patientName, appointmentDate, doctorName]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 print:hidden">
          {/* Only offered when there is a call to read — an intake-only or
              in-person visit has no transcript, and a button that opens an
              empty drawer is worse than no button. */}
          {transcript.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setTranscriptOpen(true)}
            >
              <MessageSquare className="size-3.5" />
              Conversation
              <span className="text-[10px] text-muted-foreground">
                {transcript.length}
              </span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs print:hidden"
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                Download
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => void handleDownload("pdf")}>
                <FileText className="size-3.5" />
                PDF
                <span className="ml-auto text-[10px] text-muted-foreground">
                  .pdf
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleDownload("word")}>
                <FileType className="size-3.5" />
                Word
                <span className="ml-auto text-[10px] text-muted-foreground">
                  .doc
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleDownload("text")}>
                <FileCode className="size-3.5" />
                Plain text
                <span className="ml-auto text-[10px] text-muted-foreground">
                  .txt
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Kept alongside the downloads — it is still the route to paper,
                  and to the browser's own "Save as PDF". */}
              <DropdownMenuItem onSelect={() => window.print()}>
                <Printer className="size-3.5" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        <Separator />

        {/* ── Subjective ── */}
        <NoteSection letter="S" title="Subjective">
          <NoteField label="Chief complaint">
            <EditableBlock
              readOnly={readOnly}
              value={soap.subjective.chief_complaint}
              onCommit={(v) => setSubjective({ chief_complaint: v })}
              placeholder="what brought the patient in"
              emphasis
            />
          </NoteField>

          <NoteField label="History of present illness">
            <EditableBlock
              readOnly={readOnly}
              value={soap.subjective.history_of_present_illness}
              onCommit={(v) => setSubjective({ history_of_present_illness: v })}
              placeholder="onset, duration, character, aggravating and relieving factors"
              multiline
            />
          </NoteField>

          <NoteField label="Associated symptoms">
            <EditableList
              readOnly={readOnly}
              items={soap.subjective.associated_symptoms}
              onChange={(items) => setSubjective({ associated_symptoms: items })}
              placeholder="e.g. Fever"
              addLabel="Add symptom"
            />
          </NoteField>
        </NoteSection>

        <Separator />

        {/* ── Objective ── */}
        <NoteSection letter="O" title="Objective">
          <NoteField label="Examination findings">
            <EditableList
              readOnly={readOnly}
              items={soap.objective.observations}
              onChange={(items) => setObjective({ observations: items })}
              placeholder="e.g. Temp 38.4 °C"
              addLabel="Add finding"
            />
          </NoteField>
        </NoteSection>

        <Separator />

        {/* ── Assessment ── */}
        <NoteSection letter="A" title="Assessment">
          <NoteField label="Possible conditions">
            <EditableList
              readOnly={readOnly}
              items={soap.assessment.possible_conditions}
              onChange={(items) => setAssessment({ possible_conditions: items })}
              placeholder="e.g. Acute streptococcal pharyngitis"
              addLabel="Add condition"
            />
          </NoteField>

          <NoteField label="Clinical reasoning">
            <EditableBlock
              readOnly={readOnly}
              value={soap.assessment.clinical_reasoning}
              onCommit={(v) => setAssessment({ clinical_reasoning: v })}
              placeholder="why this assessment follows from the findings"
              multiline
            />
          </NoteField>
        </NoteSection>

        <Separator />

        {/* ── Plan ── */}
        <NoteSection letter="P" title="Plan">
          <NoteField label="Next steps">
            <EditableList
              readOnly={readOnly}
              items={soap.plan.next_steps}
              onChange={(items) => setPlan({ next_steps: items })}
              placeholder="e.g. Start amoxicillin 500 mg TID for 7 days"
              addLabel="Add step"
            />
          </NoteField>

          <NoteField label="When to seek care">
            <EditableBlock
              readOnly={readOnly}
              value={soap.plan.when_to_seek_care}
              onCommit={(v) => setPlan({ when_to_seek_care: v })}
              placeholder="red flags that should bring the patient back"
              multiline
            />
          </NoteField>
        </NoteSection>

        <Separator />

        {/* ── Summary ── */}
        <NoteSection letter="∑" title="Summary">
          <EditableBlock
            readOnly={readOnly}
            value={soap.summary}
            onCommit={(v) => onChange?.({ ...soap, summary: v })}
            placeholder="one-paragraph summary of the visit"
            multiline
          />
        </NoteSection>
      </CardContent>

      <ConsultationTranscriptDrawer
        open={transcriptOpen}
        onOpenChange={setTranscriptOpen}
        transcript={transcript}
        patientName={patientName}
        appointmentDate={appointmentDate}
      />
    </Card>
  );
}
