/**
 * FieldGroup / FieldCell — layout primitives for the entry drawer bodies.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * The review page's editors ran every field together in one undifferentiated
 * column. In the drawer the fields are grouped into named sections (Code,
 * Clinical detail, Dispensing, Notes) so a doctor can jump to the part they
 * care about instead of reading top to bottom.
 *
 * These are deliberately dumb: a titled section and a labelled cell. All field
 * controls come from the existing shared components.
 */

"use client";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── FieldGroup ────────────────────────────────────────────────────────────────

interface FieldGroupProps {
  /** Section heading, e.g. "Dispensing". */
  title: string;
  /** Optional one-line explanation shown under the heading. */
  description?: string;
  children: React.ReactNode;
}

/**
 * A titled group of related fields inside the drawer.
 *
 * @param title - Section heading.
 * @param description - Optional helper text.
 * @param children - The fields.
 */
export function FieldGroup({ title, description, children }: FieldGroupProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground/70">{description}</p>
        )}
      </div>
      <Separator />
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// ── FieldCell ─────────────────────────────────────────────────────────────────

interface FieldCellProps {
  /** Field label. */
  label: string;
  /**
   * Marks the field as only settable before the entry is published.
   * fhir-gql treats several child arrays (category, note, reference ranges,
   * dosage instructions) as immutable after creation.
   */
  createOnly?: boolean;
  /** Whether the entry is already published — drives the create-only hint. */
  isPublished?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * One labelled field within a group.
 *
 * @param props - See FieldCellProps.
 */
export function FieldCell({
  label,
  createOnly = false,
  isPublished = false,
  className,
  children,
}: FieldCellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">
        {label}
        {createOnly && isPublished && (
          <span className="ml-1 text-muted-foreground/60">
            (set at creation only)
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────

/**
 * Two fields side by side, stacking on narrow drawers.
 *
 * @param children - Exactly two FieldCells.
 */
export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
