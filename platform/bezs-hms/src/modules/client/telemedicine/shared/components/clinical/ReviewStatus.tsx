/**
 * ReviewStatus — provenance markers for AI-drafted clinical content.
 *
 * Layer: client / telemedicine / shared / components / clinical
 *
 * A SOAP note and the clinical entries extracted from it are written by an
 * agent and render in exactly the same visual language as records a doctor
 * confirmed and pushed to FHIR. Without a marker the reader — including a
 * different doctor covering a shift — cannot tell them apart, which is the
 * whole risk these components exist to remove.
 *
 * The state comes from `Consultation.published_at`: null means the note and
 * extractions are still AI suggestions awaiting review. It is the only signal
 * that separates the two, because the narrative note has no FHIR counterpart
 * to check against.
 *
 * Two deliberately different weights:
 *   ReviewBanner — one clear statement per screen, with the way to act on it
 *   ReviewBadge  — compact, for an item that appears away from that banner
 *
 * Kept short on purpose. A badge repeated down a list of twelve entries turns
 * into wallpaper and stops being read, so the badge states only the fact that
 * changes behaviour and the banner carries the explanation.
 */

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves whether a consultation's note and extractions have been approved.
 *
 * `publishedAt` is authoritative. `hasPublishedResources` is a fallback for
 * rows written before the column existed, where the only evidence of approval
 * is that FHIR resources exist for the encounter — it cannot be backfilled,
 * since that evidence lives in FHIR rather than in this database. Drop the
 * fallback once no unstamped consultations remain.
 *
 * @param publishedAt - Consultation.published_at, or null when never approved.
 * @param hasPublishedResources - Whether any FHIR resource exists for the encounter.
 * @returns True when the record counts as doctor-approved.
 */
export function isDoctorApproved(
  publishedAt: Date | string | null | undefined,
  hasPublishedResources: boolean,
): boolean {
  return publishedAt != null || hasPublishedResources;
}

// ── Badge ─────────────────────────────────────────────────────────────────────

interface ReviewBadgeProps {
  /** Whether the content has been approved by a doctor. */
  approved: boolean;
  /** Hide entirely once approved, for places where only the warning matters. */
  hideWhenApproved?: boolean;
  /** Extra classes. */
  className?: string;
}

/**
 * Compact provenance badge for a single piece of AI-drafted content.
 *
 * @param approved - Whether a doctor has approved it.
 * @param hideWhenApproved - Render nothing in the approved case.
 * @param className - Extra classes.
 */
export function ReviewBadge({
  approved,
  hideWhenApproved,
  className,
}: ReviewBadgeProps) {
  if (approved) {
    if (hideWhenApproved) return null;
    return (
      <Badge
        variant="secondary"
        className={cn("gap-1 text-[10px] font-normal", className)}
      >
        In chart
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-amber-300 bg-amber-50 text-[10px] font-normal text-amber-900",
        "dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
        className,
      )}
    >
      <Sparkles className="size-2.5" />
      AI draft
    </Badge>
  );
}

// ── Banner ────────────────────────────────────────────────────────────────────

interface ReviewBannerProps {
  /**
   * What the banner is describing, e.g. "note" or "note and clinical entries".
   * Folded into the sentence so one component serves every screen.
   */
  subject?: string;
  /** Review page to link to. Omit to render the message without an action. */
  reviewHref?: string;
  /** Label for the action button. */
  actionLabel?: string;
  /** Extra classes. */
  className?: string;
}

/**
 * Full-width notice that the content on screen is not in the patient's chart.
 *
 * Render only in the unapproved case — the caller decides, since the approved
 * state usually needs no banner at all.
 *
 * @param subject - What is awaiting review, folded into the sentence.
 * @param reviewHref - Review page link; omitted renders no action.
 * @param actionLabel - Button label.
 * @param className - Extra classes.
 */
export function ReviewBanner({
  subject = "note and clinical entries",
  reviewHref,
  actionLabel = "Review & approve",
  className,
}: ReviewBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3",
        "dark:border-amber-900 dark:bg-amber-950/40 print:hidden",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
          Not in the patient&apos;s chart yet
        </p>
        <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300/90">
          This {subject} {subject.includes("and") ? "are" : "is"} AI-suggested
          and awaiting your review. Nothing here has been written to the EMR.
        </p>
      </div>
      {reviewHref && (
        <Button asChild size="sm" className="shrink-0">
          <Link href={reviewHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
