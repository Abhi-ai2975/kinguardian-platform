/**
 * ConditionList — managed list of ConditionItem cards.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / conditions
 *
 * Renders all condition items from the AI extraction (or doctor additions),
 * wires add/remove/update callbacks, and shows an "Add Condition" button.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ConditionItem } from "./ConditionItem";
import type { ConditionFormItem } from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConditionListProps {
  /** Full list of condition items — controlled by ClinicalExtractionPanel. */
  items: ConditionFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onChange: (items: ConditionFormItem[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Creates a blank condition item with a unique id for manual additions. */
function emptyCondition(): ConditionFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "SNOMED",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the full list of condition cards with add/remove controls.
 * Shows an empty-state message when no conditions are present.
 *
 * @param items - Controlled condition array.
 * @param onChange - Parent setter receiving the full updated array.
 */
export function ConditionList({ items, onChange }: ConditionListProps) {
  const update = (index: number, item: ConditionFormItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const add = () => onChange([...items, emptyCondition()]);

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No conditions — add one below.
        </p>
      )}
      {items.map((item, i) => (
        <ConditionItem
          key={item.id}
          item={item}
          onChange={(updated) => update(i, updated)}
          onRemove={() => remove(i)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 w-full"
        onClick={add}
      >
        <Plus className="h-4 w-4" />
        Add Condition
      </Button>
    </div>
  );
}
