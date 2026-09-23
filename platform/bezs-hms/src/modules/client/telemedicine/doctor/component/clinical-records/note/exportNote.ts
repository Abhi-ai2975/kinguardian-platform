/**
 * exportNote — download the consultation note as PDF, Word or plain text.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / note
 *
 * A SOAP note is prose, not tabular data, so none of the table export helpers
 * in shared/components/tables fit — those build a grid via jspdf-autotable.
 * This lays the note out as a document instead: headings, wrapped paragraphs
 * and bulleted lists, flowing across pages.
 *
 * Formats offered, and why each:
 *   PDF  — the format a clinical document is normally filed and shared as.
 *   Word — opens editable, for a doctor amending wording outside the app.
 *   Text — no dependency on any reader; useful for pasting into other systems.
 *
 * The Word export is an HTML document served as `application/msword` with a
 * .doc extension. Word, LibreOffice and Google Docs all open it correctly and
 * keep the headings and lists. Real .docx would need a new dependency (`docx`)
 * for output that is no more useful here — worth revisiting only if styling
 * fidelity or .docx specifically is required.
 *
 * jsPDF is imported dynamically, matching export-utils.ts, so it stays out of
 * the initial bundle for everyone who never downloads a note.
 */

import type { SoapNote } from "../../appointment-review/types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Formats the note can be downloaded as. */
export type NoteExportFormat = "pdf" | "word" | "text";

/** Letterhead details shown at the top of every export. */
export interface NoteExportMeta {
  /** Patient display name. */
  patientName: string;
  /** Authoring doctor's display name. */
  doctorName: string;
  /** Formatted visit date, or null when unknown. */
  appointmentDate: string | null;
  /**
   * Whether the doctor has approved the note. An unapproved note carries a
   * line saying so — once it leaves the app as a file there is no badge and no
   * banner, and a reader has no other way to tell a draft from a final note.
   */
  reviewed?: boolean;
}

/** One rendered section of the note. */
interface NoteSection {
  heading: string;
  /** Label + body pairs. Bodies are already flattened to strings. */
  fields: { label: string; lines: string[] }[];
}

// ── Shared shaping ────────────────────────────────────────────────────────────

/** Drops blank entries — an empty list row is an artefact of the editor. */
function clean(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0);
}

/** Wraps a single value as a one-line body, or nothing when empty. */
function line(value: string): string[] {
  return value.trim().length > 0 ? [value.trim()] : [];
}

/**
 * Flattens a SOAP note into ordered sections for rendering.
 *
 * Sections and fields with no content are dropped entirely rather than printed
 * as an em dash — a downloaded document should not carry empty headings.
 *
 * @param soap - The note to render.
 * @returns Sections in S / O / A / P / Summary order.
 */
function toSections(soap: SoapNote): NoteSection[] {
  const all: NoteSection[] = [
    {
      heading: "Subjective",
      fields: [
        { label: "Chief complaint", lines: line(soap.subjective.chief_complaint) },
        {
          label: "History of present illness",
          lines: line(soap.subjective.history_of_present_illness),
        },
        {
          label: "Associated symptoms",
          lines: clean(soap.subjective.associated_symptoms),
        },
      ],
    },
    {
      heading: "Objective",
      fields: [
        {
          label: "Examination findings",
          lines: clean(soap.objective.observations),
        },
      ],
    },
    {
      heading: "Assessment",
      fields: [
        {
          label: "Possible conditions",
          lines: clean(soap.assessment.possible_conditions),
        },
        {
          label: "Clinical reasoning",
          lines: line(soap.assessment.clinical_reasoning),
        },
      ],
    },
    {
      heading: "Plan",
      fields: [
        { label: "Next steps", lines: clean(soap.plan.next_steps) },
        {
          label: "When to seek care",
          lines: line(soap.plan.when_to_seek_care),
        },
      ],
    },
    { heading: "Summary", fields: [{ label: "", lines: line(soap.summary) }] },
  ];

  return all
    .map((section) => ({
      ...section,
      fields: section.fields.filter((f) => f.lines.length > 0),
    }))
    .filter((section) => section.fields.length > 0);
}

/** Builds the letterhead sub-title, e.g. "Jane Doe · 12 Aug 2026 · Dr Smith". */
function subtitle(meta: NoteExportMeta): string {
  return [meta.patientName, meta.appointmentDate, meta.doctorName]
    .filter(Boolean)
    .join(" · ");
}

/** The draft warning, or null when the note has been approved. */
function draftNotice(meta: NoteExportMeta): string | null {
  return meta.reviewed === false
    ? "DRAFT — not yet reviewed or approved by the treating clinician."
    : null;
}

/**
 * Builds a filesystem-safe filename stem, e.g. "consultation-note-jane-doe".
 *
 * @param meta - Letterhead details.
 * @returns Filename without an extension.
 */
function filenameStem(meta: NoteExportMeta): string {
  const slug = meta.patientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `consultation-note-${slug}` : "consultation-note";
}

/**
 * Triggers a browser download for a generated string.
 *
 * @param content - File body.
 * @param filename - Full filename including extension.
 * @param mimeType - MIME type for the Blob.
 */
function downloadString(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  /* Deferred so the download has started before the URL is released. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Text ──────────────────────────────────────────────────────────────────────

/**
 * Renders the note as plain text.
 *
 * @param soap - The note.
 * @param meta - Letterhead details.
 * @returns The full document as a string.
 */
export function noteToPlainText(soap: SoapNote, meta: NoteExportMeta): string {
  const out: string[] = ["CONSULTATION NOTE", subtitle(meta)];

  const draft = draftNotice(meta);
  if (draft) out.push("", draft);

  for (const section of toSections(soap)) {
    out.push("", section.heading.toUpperCase(), "-".repeat(section.heading.length));
    for (const field of section.fields) {
      if (field.label) out.push("", field.label);
      /* Single values read as prose; multiples are a list, so bullet them. */
      const bullet = field.lines.length > 1;
      for (const l of field.lines) out.push(bullet ? `  - ${l}` : l);
    }
  }

  return out.join("\n");
}

// ── Word ──────────────────────────────────────────────────────────────────────

/** Escapes text for safe inclusion in the generated HTML document. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Renders the note as a Word-compatible HTML document.
 *
 * @param soap - The note.
 * @param meta - Letterhead details.
 * @returns Complete HTML document string.
 */
export function noteToWordHtml(soap: SoapNote, meta: NoteExportMeta): string {
  const draft = draftNotice(meta);

  const body = toSections(soap)
    .map((section) => {
      const fields = section.fields
        .map((field) => {
          const label = field.label
            ? `<p style="margin:10pt 0 2pt;font-size:9pt;color:#666;text-transform:uppercase;letter-spacing:.5pt;">${escapeHtml(field.label)}</p>`
            : "";
          const content =
            field.lines.length > 1
              ? `<ul style="margin:0 0 0 16pt;padding:0;">${field.lines
                  .map((l) => `<li style="margin:2pt 0;">${escapeHtml(l)}</li>`)
                  .join("")}</ul>`
              : `<p style="margin:0;">${escapeHtml(field.lines[0] ?? "")}</p>`;
          return label + content;
        })
        .join("");

      return `<h2 style="margin:18pt 0 4pt;font-size:12pt;border-bottom:1px solid #ccc;padding-bottom:2pt;">${escapeHtml(section.heading)}</h2>${fields}`;
    })
    .join("");

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Consultation Note</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;">
  <h1 style="margin:0;font-size:16pt;">Consultation Note</h1>
  <p style="margin:2pt 0 0;color:#666;font-size:10pt;">${escapeHtml(subtitle(meta))}</p>
  ${draft ? `<p style="margin:10pt 0;padding:6pt;border:1px solid #c47f17;background:#fdf6e6;color:#7a4d06;font-size:10pt;"><strong>${escapeHtml(draft)}</strong></p>` : ""}
  ${body}
</body>
</html>`;
}

// ── PDF ───────────────────────────────────────────────────────────────────────

/** Page geometry, in the jsPDF default unit (mm) for A4 portrait. */
const PAGE = { width: 210, height: 297, margin: 18 } as const;
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

/**
 * Builds the note as a jsPDF document.
 *
 * Laid out by hand rather than with jspdf-autotable: the note is prose, and the
 * table helper used elsewhere in the app would force it into a grid.
 *
 * Returns the document rather than saving it so the layout — wrapping and page
 * breaks especially — can be exercised without a browser.
 *
 * @param soap - The note.
 * @param meta - Letterhead details.
 * @returns The rendered jsPDF document.
 */
export async function buildNotePdf(soap: SoapNote, meta: NoteExportMeta) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = PAGE.margin;

  /** Advances to a new page when the next block would overflow the margin. */
  function ensureSpace(needed: number) {
    if (y + needed <= PAGE.height - PAGE.margin) return;
    doc.addPage();
    y = PAGE.margin;
  }

  /** Writes wrapped text and advances the cursor, paginating as needed. */
  function write(text: string, size: number, style: "normal" | "bold", indent = 0) {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    const lineHeight = size * 0.42;
    for (const l of doc.splitTextToSize(text, CONTENT_WIDTH - indent) as string[]) {
      ensureSpace(lineHeight);
      doc.text(l, PAGE.margin + indent, y);
      y += lineHeight;
    }
  }

  // ── Letterhead ──
  write("Consultation Note", 16, "bold");
  y += 1;
  doc.setTextColor(110);
  write(subtitle(meta), 10, "normal");
  doc.setTextColor(17);
  y += 2;

  const draft = draftNotice(meta);
  if (draft) {
    doc.setTextColor(150, 80, 10);
    write(draft, 10, "bold");
    doc.setTextColor(17);
    y += 2;
  }

  // ── Sections ──
  for (const section of toSections(soap)) {
    y += 4;
    ensureSpace(10);
    write(section.heading, 12, "bold");
    /* Rule under the heading, matching the on-screen section divider. */
    doc.setDrawColor(200);
    doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
    y += 4;

    for (const field of section.fields) {
      if (field.label) {
        doc.setTextColor(110);
        write(field.label.toUpperCase(), 8, "bold");
        doc.setTextColor(17);
        y += 0.5;
      }
      const bullet = field.lines.length > 1;
      for (const l of field.lines) {
        write(bullet ? `•  ${l}` : l, 10, "normal", bullet ? 3 : 0);
      }
      y += 2;
    }
  }

  return doc;
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Downloads the consultation note in the requested format.
 *
 * @param format - "pdf", "word" or "text".
 * @param soap - The note to export.
 * @param meta - Letterhead details.
 * @throws Whatever jsPDF throws if the PDF renderer fails to load; callers
 *         surface it as a toast.
 */
export async function downloadNote(
  format: NoteExportFormat,
  soap: SoapNote,
  meta: NoteExportMeta,
): Promise<void> {
  const stem = filenameStem(meta);

  switch (format) {
    case "pdf": {
      const doc = await buildNotePdf(soap, meta);
      doc.save(`${stem}.pdf`);
      return;
    }
    case "word":
      downloadString(
        noteToWordHtml(soap, meta),
        `${stem}.doc`,
        "application/msword",
      );
      return;
    case "text":
      downloadString(
        noteToPlainText(soap, meta),
        `${stem}.txt`,
        "text/plain;charset=utf-8",
      );
      return;
  }
}
