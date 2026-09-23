/**
 * ConditionItem — single condition card in the ClinicalExtractionPanel.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / conditions
 *
 * Shows the AI-extracted display name and system badge, a TerminologyCombobox to
 * resolve to a FHIR code, and editable fields for clinical status, verification
 * status, severity, category, onset/abatement dates, and a free-text note.
 *
 * Fields marked "CREATE only" are sent to the API on first save but cannot be
 * changed via PATCH once the FHIR resource exists (child arrays are immutable).
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Sparkles } from "lucide-react";
import { TerminologyCombobox } from "../../shared/TerminologyCombobox";
import { ConceptSelect } from "../../shared/ConceptSelect";
import {
  TERMINOLOGY_SYSTEM_URL,
  CONDITION_CLINICAL_STATUS,
  CONDITION_VERIFICATION_STATUS,
  type ConditionFormItem,
} from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConditionItemProps {
  /** Current condition form item — controlled by ConditionList. */
  item: ConditionFormItem;
  /** Called when any field on this item changes. */
  onChange: (item: ConditionFormItem) => void;
  /** Called when the doctor removes this item. */
  onRemove: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Card-based editor for a single FHIR Condition.
 *
 * @param item - Condition form item (AI-suggested + optional doctor edits).
 * @param onChange - Setter receiving the full updated item.
 * @param onRemove - Called when the doctor clicks the delete button.
 */
export function ConditionItem({ item, onChange, onRemove }: ConditionItemProps) {
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

        {/* Clinical status + Verification status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Clinical Status</Label>
            <ConceptSelect
              resource="Condition"
              field="clinicalStatus"
              value={item.clinicalStatus}
              onChange={(code) => onChange({ ...item, clinicalStatus: code })}
              placeholder="Select status"
              fallback={CONDITION_CLINICAL_STATUS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Verification</Label>
            <ConceptSelect
              resource="Condition"
              field="verificationStatus"
              value={item.verificationStatus}
              onChange={(code) => onChange({ ...item, verificationStatus: code })}
              placeholder="Select verification"
              fallback={CONDITION_VERIFICATION_STATUS}
            />
          </div>
        </div>

        {/* Severity + Category */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Severity</Label>
            <ConceptSelect
              resource="Condition"
              field="severity"
              value={item.severity}
              onChange={(code) => onChange({ ...item, severity: code })}
              placeholder="Select severity"
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
              resource="Condition"
              field="category"
              value={item.category}
              onChange={(code) => onChange({ ...item, category: code })}
              placeholder="Select category"
            />
          </div>
        </div>

        {/* Onset + Abatement dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Onset Date</Label>
            <Input
              type="date"
              value={item.onsetDatetime?.substring(0, 10) ?? ""}
              onChange={(e) =>
                onChange({ ...item, onsetDatetime: e.target.value || undefined })
              }
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Abatement Date</Label>
            <Input
              type="date"
              value={item.abatementDatetime?.substring(0, 10) ?? ""}
              onChange={(e) =>
                onChange({ ...item, abatementDatetime: e.target.value || undefined })
              }
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
