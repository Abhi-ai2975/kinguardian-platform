/**
 * MedicationItem — single medication request card in the ClinicalExtractionPanel.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / medications
 *
 * Shows AI badge, terminology combobox (RxNorm), the full dosage grid
 * (dose / route / frequency / duration), status / intent / priority / course-of-therapy
 * selects, clinical indication, patient instructions, dispense details
 * (refills + quantity + unit), substitution toggle, and a free-text note.
 *
 * Fields marked "CREATE only" can only be set when creating a new record. Once a
 * FHIR resource has a fhirId, those child-array fields are immutable.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Sparkles } from "lucide-react";
import { TerminologyCombobox } from "../../shared/TerminologyCombobox";
import { ConceptSelect } from "../../shared/ConceptSelect";
import {
  TERMINOLOGY_SYSTEM_URL,
  MEDICATION_REQUEST_STATUS,
  MEDICATION_REQUEST_INTENT,
  type MedicationFormItem,
} from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MedicationItemProps {
  /** Current medication form item — controlled by MedicationList. */
  item: MedicationFormItem;
  /** Called when any field on this item changes. */
  onChange: (item: MedicationFormItem) => void;
  /** Called when the doctor removes this item. */
  onRemove: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Card-based editor for a single FHIR MedicationRequest.
 * Covers dosage, clinical intent, dispense details, and substitution.
 *
 * @param item - Medication form item (AI-suggested + optional doctor edits).
 * @param onChange - Setter receiving the full updated item.
 * @param onRemove - Called when the doctor clicks the delete button.
 */
export function MedicationItem({ item, onChange, onRemove }: MedicationItemProps) {
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

        {/* Dosage grid — dose / route / frequency / duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Dose</Label>
            <Input
              value={item.editedDose ?? item.dose ?? ""}
              onChange={(e) => onChange({ ...item, editedDose: e.target.value })}
              placeholder="e.g. 500 mg"
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Route</Label>
            <Input
              value={item.editedRoute ?? item.route ?? ""}
              onChange={(e) => onChange({ ...item, editedRoute: e.target.value })}
              placeholder="e.g. Oral"
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Frequency</Label>
            <Input
              value={item.editedFrequency ?? item.frequency ?? ""}
              onChange={(e) => onChange({ ...item, editedFrequency: e.target.value })}
              placeholder="e.g. Three times daily"
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Input
              value={item.editedDuration ?? item.duration ?? ""}
              onChange={(e) => onChange({ ...item, editedDuration: e.target.value })}
              placeholder="e.g. 7 days"
              className="text-sm h-9"
            />
          </div>
        </div>

        {/* Status + Intent */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <ConceptSelect
              resource="MedicationRequest"
              field="status"
              value={item.status}
              onChange={(code) => onChange({ ...item, status: code })}
              placeholder="Select status"
              fallback={MEDICATION_REQUEST_STATUS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Intent</Label>
            <ConceptSelect
              resource="MedicationRequest"
              field="intent"
              value={item.intent}
              onChange={(code) => onChange({ ...item, intent: code })}
              placeholder="Select intent"
              fallback={MEDICATION_REQUEST_INTENT}
            />
          </div>
        </div>

        {/* Priority + Course of therapy */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <ConceptSelect
              resource="MedicationRequest"
              field="priority"
              value={item.priority}
              onChange={(code) => onChange({ ...item, priority: code })}
              placeholder="Select priority"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Course of Therapy</Label>
            <ConceptSelect
              resource="MedicationRequest"
              field="courseOfTherapyType"
              value={item.courseOfTherapyType}
              onChange={(code) => onChange({ ...item, courseOfTherapyType: code })}
              placeholder="Acute / Chronic…"
            />
          </div>
        </div>

        {/* Reason / Indication */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Reason / Indication
            {item.fhirId && (
              <span className="ml-1 text-muted-foreground/60">(read-only on saved records)</span>
            )}
          </Label>
          <Input
            value={item.reasonCode ?? ""}
            onChange={(e) => onChange({ ...item, reasonCode: e.target.value || undefined })}
            placeholder="e.g. Hypertension"
            className="text-sm h-9"
          />
        </div>

        {/* Patient instructions */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Patient Instructions
            {item.fhirId && (
              <span className="ml-1 text-muted-foreground/60">(read-only on saved records)</span>
            )}
          </Label>
          <Textarea
            value={item.patientInstruction ?? ""}
            onChange={(e) =>
              onChange({ ...item, patientInstruction: e.target.value || undefined })
            }
            placeholder="e.g. Take with food. Avoid alcohol."
            className="text-sm resize-none"
            rows={2}
          />
        </div>

        {/* Dispense details — Refills / Quantity / Unit */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Dispense</Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground/70">Refills</p>
              <Input
                type="number"
                min={0}
                value={item.dispenseRepeatsAllowed ?? ""}
                onChange={(e) =>
                  onChange({
                    ...item,
                    dispenseRepeatsAllowed: e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined,
                  })
                }
                placeholder="0"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground/70">Qty</p>
              <Input
                value={item.dispenseQuantityValue ?? ""}
                onChange={(e) =>
                  onChange({ ...item, dispenseQuantityValue: e.target.value || undefined })
                }
                placeholder="e.g. 30"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground/70">Unit</p>
              <Input
                value={item.dispenseQuantityUnit ?? ""}
                onChange={(e) =>
                  onChange({ ...item, dispenseQuantityUnit: e.target.value || undefined })
                }
                placeholder="tablets"
                className="text-sm h-9"
              />
            </div>
          </div>
        </div>

        {/* Substitution allowed */}
        <div className="flex items-center gap-2 pt-0.5">
          <Checkbox
            id={`substitution-${item.id}`}
            checked={item.substitutionAllowed ?? false}
            onCheckedChange={(checked) =>
              onChange({ ...item, substitutionAllowed: checked === true })
            }
          />
          <Label
            htmlFor={`substitution-${item.id}`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Allow generic substitution
          </Label>
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
            placeholder="Additional notes..."
            className="text-sm resize-none"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
