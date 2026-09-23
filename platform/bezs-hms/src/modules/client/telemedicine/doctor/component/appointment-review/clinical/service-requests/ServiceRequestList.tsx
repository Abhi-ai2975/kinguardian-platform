/**
 * ServiceRequestList — managed list of ServiceRequestItem cards.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / service-requests
 *
 * Renders all service request (lab/imaging order) items from the AI extraction
 * or doctor additions, wires add/remove/update callbacks.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ServiceRequestItem } from "./ServiceRequestItem";
import type { ServiceRequestFormItem } from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceRequestListProps {
  /** Full list of service request items — controlled by ClinicalExtractionPanel. */
  items: ServiceRequestFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onChange: (items: ServiceRequestFormItem[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Creates a blank service request item for manual doctor additions. */
function emptyServiceRequest(): ServiceRequestFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "LOINC",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the full list of service request cards with add/remove controls.
 *
 * @param items - Controlled service request array.
 * @param onChange - Parent setter receiving the full updated array.
 */
export function ServiceRequestList({ items, onChange }: ServiceRequestListProps) {
  const update = (index: number, item: ServiceRequestFormItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const add = () => onChange([...items, emptyServiceRequest()]);

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No service requests — add one below.
        </p>
      )}
      {items.map((item, i) => (
        <ServiceRequestItem
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
        Add Service Request
      </Button>
    </div>
  );
}
