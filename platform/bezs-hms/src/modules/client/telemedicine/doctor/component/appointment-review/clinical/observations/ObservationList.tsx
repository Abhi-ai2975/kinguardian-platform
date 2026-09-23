/**
 * ObservationList — managed list of ObservationItem cards.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / observations
 *
 * Renders all observation items from the AI extraction (or doctor additions),
 * wires add/remove/update callbacks, and shows an "Add Observation" button.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ObservationItem } from "./ObservationItem";
import type { ObservationFormItem } from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ObservationListProps {
  /** Full list of observation items — controlled by ClinicalExtractionPanel. */
  items: ObservationFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onChange: (items: ObservationFormItem[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Creates a blank observation item for manual doctor additions. */
function emptyObservation(): ObservationFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "LOINC",
    value: null,
    unit: null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the full list of observation cards with add/remove controls.
 *
 * @param items - Controlled observation array.
 * @param onChange - Parent setter receiving the full updated array.
 */
export function ObservationList({ items, onChange }: ObservationListProps) {
  const update = (index: number, item: ObservationFormItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const add = () => onChange([...items, emptyObservation()]);

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No observations — add one below.
        </p>
      )}
      {items.map((item, i) => (
        <ObservationItem
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
        Add Observation
      </Button>
    </div>
  );
}
