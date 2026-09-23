/**
 * ObservationItem — single observation card in the ClinicalExtractionPanel.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / observations
 *
 * Shows AI badge, terminology combobox, editable value/unit inputs, status select,
 * and additional clinical fields: category, effective date/time, interpretation,
 * reference range (low / high / unit), and a free-text note.
 *
 * Fields marked "CREATE only" are sent on first save but cannot be changed via
 * PATCH once the FHIR resource exists (child arrays are immutable).
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Sparkles } from "lucide-react";
import { TerminologyCombobox } from "../../shared/TerminologyCombobox";
import { ConceptSelect } from "../../shared/ConceptSelect";
import {
  TERMINOLOGY_SYSTEM_URL,
  OBSERVATION_STATUS,
  type ObservationFormItem,
} from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ObservationItemProps {
  /** Current observation form item — controlled by ObservationList. */
  item: ObservationFormItem;
  /** Called when any field on this item changes. */
  onChange: (item: ObservationFormItem) => void;
  /** Called when the doctor removes this item. */
  onRemove: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Card-based editor for a single FHIR Observation.
 *
 * @param item - Observation form item (AI-suggested + optional doctor edits).
 * @param onChange - Setter receiving the full updated item.
 * @param onRemove - Called when the doctor clicks the delete button.
 */
export function ObservationItem({ item, onChange, onRemove }: ObservationItemProps) {
  const system =
    TERMINOLOGY_SYSTEM_URL[item.terminologySystem] ?? item.terminologySystem;

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* AI badge header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="secondary" className="gap-1 shrink-0 text-xs">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
            <span className="text-sm text-muted-foreground truncate">{item.display}</span>
            <Badge variant="outline" className="text-xs shrink-0 font-mono">
              {item.terminologySystem}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Terminology search */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Terminology Code ({item.terminologySystem})
          </Label>
          <TerminologyCombobox
            system={system}
            initialQuery={item.display}
            value={item.resolved ?? null}
            onChange={(concept) =>
              onChange({ ...item, resolved: concept ?? undefined })
            }
            placeholder={`Search ${item.terminologySystem}...`}
          />
        </div>

        {/* Value + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Value</Label>
            <Input
              value={item.editedValue ?? item.value ?? ""}
              onChange={(e) => onChange({ ...item, editedValue: e.target.value })}
              placeholder="e.g. 101.2"
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Unit</Label>
            <Input
              value={item.editedUnit ?? item.unit ?? ""}
              onChange={(e) => onChange({ ...item, editedUnit: e.target.value })}
              placeholder="e.g. mmHg"
              className="text-sm h-9"
            />
          </div>
        </div>

        {/* Status + Category */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <ConceptSelect
              resource="Observation"
              field="status"
              value={item.status}
              onChange={(code) => onChange({ ...item, status: code })}
              placeholder="Select status"
              fallback={OBSERVATION_STATUS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Category
              {item.fhirId && (
                <span className="ml-1 text-muted-foreground/60">(read-only)</span>
              )}
            </Label>
            <ConceptSelect
              resource="Observation"
              field="category"
              value={item.category}
              onChange={(code) => onChange({ ...item, category: code })}
              placeholder="Select category"
            />
          </div>
        </div>

        {/* Effective date/time + Interpretation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Effective Date/Time</Label>
            {/* DateTimePicker renders the stored instant in local time. The old
                native input needed effectiveDatetime.substring(0, 16) to be
                accepted at all, which silently discarded the timezone. */}
            <DateTimePicker
              value={item.effectiveDatetime ?? ""}
              onChange={(value) =>
                onChange({ ...item, effectiveDatetime: value || undefined })
              }
              placeholder="Pick date & time…"
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Interpretation
              {item.fhirId && (
                <span className="ml-1 text-muted-foreground/60">(read-only)</span>
              )}
            </Label>
            <ConceptSelect
              resource="Observation"
              field="interpretation"
              value={item.interpretation}
              onChange={(code) => onChange({ ...item, interpretation: code })}
              placeholder="Normal / High / Low…"
            />
          </div>
        </div>

        {/* Reference range — Low / High / Unit */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Reference Range
            {item.fhirId && (
              <span className="ml-1 text-muted-foreground/60">(read-only on saved records)</span>
            )}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={item.refRangeLow ?? ""}
              onChange={(e) =>
                onChange({ ...item, refRangeLow: e.target.value || undefined })
              }
              placeholder="Low"
              className="text-sm h-9"
            />
            <Input
              value={item.refRangeHigh ?? ""}
              onChange={(e) =>
                onChange({ ...item, refRangeHigh: e.target.value || undefined })
              }
              placeholder="High"
              className="text-sm h-9"
            />
            <Input
              value={item.refRangeUnit ?? ""}
              onChange={(e) =>
                onChange({ ...item, refRangeUnit: e.target.value || undefined })
              }
              placeholder="Unit"
              className="text-sm h-9"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Notes
            {item.fhirId && (
              <span className="ml-1 text-muted-foreground/60">(read-only on saved records)</span>
            )}
          </Label>
          <Textarea
            value={item.note ?? ""}
            onChange={(e) => onChange({ ...item, note: e.target.value || undefined })}
            placeholder="Clinical notes..."
            className="text-sm resize-none"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
