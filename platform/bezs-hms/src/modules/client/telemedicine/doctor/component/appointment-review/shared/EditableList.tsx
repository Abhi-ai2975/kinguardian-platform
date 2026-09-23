/**
 * EditableList — controlled list of freetext string inputs with add/remove.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / shared
 *
 * Used in all four SOAP accordion sections (symptoms, findings, conditions, steps).
 * The parent owns the string[] state and receives updates via onChange.
 *
 * The row list is capped to MAX_LIST_HEIGHT with its own native scrollbar
 * (overflow-y-auto — not shadcn's ScrollArea, see the note on that component's
 * own history of not scrolling where it was dropped into a flex layout without
 * care). The Add button sits outside that box, after it, so it stays at a
 * fixed, predictable position regardless of how many rows are in the list —
 * a section that grows to dozens of items scrolls within its own card instead
 * of pushing the button (and every accordion section below it) further down
 * the page.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Max height of the scrollable row box, in pixels — roughly 5 rows before a
 * scrollbar appears. Tall enough that a typical short list (2-4 items) never
 * shows one, short enough that a long list can't dominate its accordion card.
 */
const MAX_LIST_HEIGHT = 208;

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditableListProps {
  /** Current list of string items — controlled by parent. */
  items: string[];
  /** Called whenever items change (add, edit, or remove). */
  onChange: (items: string[]) => void;
  /** Placeholder text for each input field. */
  placeholder?: string;
  /** Label on the "Add" button. */
  addLabel?: string;
  /**
   * Renders the items as a plain bulleted list with no inputs, delete buttons
   * or add control. Used where the list is a record rather than a form.
   */
  readOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a list of text inputs with add and remove controls.
 * Each item maps to one Input + ghost delete button row.
 *
 * @param items - Controlled array of strings.
 * @param onChange - Parent setter — receives the full new array.
 * @param placeholder - Input placeholder text.
 * @param addLabel - Text shown on the add button.
 */
export function EditableList({
  items,
  onChange,
  placeholder = "Add item...",
  addLabel = "Add",
  readOnly = false,
}: EditableListProps) {
  const update = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const add = () => onChange([...items, ""]);

  /* Read-only short-circuits before any of the edit handlers are wired up.
     Blank entries are filtered: an empty row is an artefact of the add button,
     meaningless once the list is a record. */
  if (readOnly) {
    const entries = items.filter((item) => item.trim().length > 0);
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground">—</p>;
    }
    return (
      <ul className="space-y-1">
        {entries.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span aria-hidden className="mt-0.5 text-muted-foreground">
              ·
            </span>
            <span className="min-w-0 flex-1">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div
          className="space-y-2 overflow-y-auto pr-1"
          style={{ maxHeight: MAX_LIST_HEIGHT }}
        >
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => update(i, e.target.value)}
                placeholder={placeholder}
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground h-7 text-xs px-1"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
