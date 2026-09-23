/**
 * ClinicalEntryRow — one compact row in a clinical entry list.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * Shows the four things a doctor needs to recognise an entry at a glance:
 * its name, whether it carries a terminology code, a summary of its key values,
 * and whether it is already in the EMR. Everything else lives in the drawer.
 *
 * The coding chip matters clinically: an entry with no resolved code publishes
 * as free text with no coded meaning. On the old flat-card editor that was
 * invisible until you scrolled to the terminology field, so it is surfaced here.
 */

"use client";

import { AlertTriangle, Check, ChevronRight, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClinicalEntryRowProps {
  /** Entry name — falls back to a placeholder when the doctor has not named it. */
  title: string;
  /** One-line summary of the entry's key values; may be empty. */
  summary: string;
  /** Short terminology system name, e.g. "RXNORM". */
  terminologySystem: string;
  /** Whether a terminology code has been resolved for this entry. */
  isCoded: boolean;
  /** Whether the entry already exists in the EMR. */
  isPublished: boolean;
  /** Opens the detail drawer. */
  onOpen: () => void;
  /** Removes the entry. */
  onRemove: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A single clickable entry row.
 *
 * @param props - See ClinicalEntryRowProps.
 */
export function ClinicalEntryRow({
  title,
  summary,
  terminologySystem,
  isCoded,
  isPublished,
  onOpen,
  onRemove,
}: ClinicalEntryRowProps) {
  const hasTitle = title.trim().length > 0;

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40">
      {/* Clickable body — opens the drawer */}
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 min-w-0 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium truncate",
                !hasTitle && "text-muted-foreground italic font-normal",
              )}
            >
              {hasTitle ? title : "Untitled entry"}
            </span>

            {/* Coding status — the clinically important signal */}
            {isCoded ? (
              <Badge
                variant="secondary"
                className="gap-1 text-[10px] font-mono font-normal shrink-0"
              >
                <Check className="size-2.5" />
                {terminologySystem}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] font-normal shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400"
              >
                <AlertTriangle className="size-2.5" />
                No code
              </Badge>
            )}

            {isPublished && (
              <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                In EMR
              </Badge>
            )}
          </div>

          {summary && (
            <p className="text-xs text-muted-foreground truncate">{summary}</p>
          )}
        </div>
      </button>

      {/* Remove — kept outside the open button so it is not a nested control */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${hasTitle ? title : "entry"}`}
        className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
