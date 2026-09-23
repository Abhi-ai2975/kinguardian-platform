/**
 * DocumentSummaryPanel — AI summary of the document, right of the split.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * UI only. Nothing here is generated from the file — the sections below are the
 * shape a summary will take, with placeholder copy in place of content.
 *
 * Deliberately not filled with plausible-looking clinical text. Realistic dummy
 * findings sitting beside a real result is exactly how placeholder copy ends up
 * being read as an actual reading of the document, so each section states that
 * it is empty instead.
 */

"use client";

import { Activity, FileText, Sparkles, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentSummaryPanelProps {
  /** Filename, named in the placeholder so the panel has context. */
  fileTitle: string | null;
  /** The order or document this file belongs to. */
  parentLabel: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Placeholder layout for the document summary.
 *
 * @param fileTitle - Filename.
 * @param parentLabel - Owning order or document type.
 */
export function DocumentSummaryPanel({
  fileTitle,
  parentLabel,
}: DocumentSummaryPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* ── Unwired notice ── */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
        <Sparkles className="size-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Interface preview — no summary has been generated
        </p>
        <Badge variant="outline" className="ml-auto text-[10px] font-normal">
          Coming soon
        </Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-4">
          {/* ── What this is ── */}
          <div className="rounded-md border bg-muted/20 px-3 py-2.5">
            <p className="text-sm font-medium">{fileTitle ?? "This file"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{parentLabel}</p>
          </div>

          <SummarySection
            icon={FileText}
            title="Overview"
            body="A plain-language summary of the document will appear here."
          />

          <SummarySection
            icon={Activity}
            title="Key values"
            body="Measured values and their reference ranges will be listed here, with anything outside range marked."
          />

          <SummarySection
            icon={TriangleAlert}
            title="Flagged findings"
            body="Anything warranting attention will be called out here."
            tone="warning"
          />
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * One titled placeholder section.
 *
 * @param icon - Section icon.
 * @param title - Section heading.
 * @param body - Placeholder description of what will go here.
 * @param tone - "warning" tints the heading for the flagged section.
 */
function SummarySection({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
  tone?: "warning";
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon
          className={
            tone === "warning"
              ? "size-3.5 text-amber-600 dark:text-amber-500"
              : "size-3.5 text-muted-foreground"
          }
        />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      {/* Dashed rather than solid: an empty placeholder should not look like a
          populated card with nothing in it. */}
      <p className="rounded-md border border-dashed px-3 py-3 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </section>
  );
}
