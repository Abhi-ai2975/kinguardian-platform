/**
 * ServiceRequestItem — single service request card in the ClinicalExtractionPanel.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / service-requests
 *
 * Shows AI badge, terminology combobox (LOINC), status / intent / priority selects,
 * and additional clinical fields: category, occurrence date, reason/indication,
 * patient instructions, as-needed toggle, and a free-text note.
 *
 * Fields marked "CREATE only" can only be set when creating a new record. Once a
 * FHIR resource has a fhirId, those child-array fields are immutable.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/modules/client/shared/components/DateTimePicker";
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
  SERVICE_REQUEST_STATUS,
  SERVICE_REQUEST_INTENT,
  SERVICE_REQUEST_PRIORITY,
  type ServiceRequestFormItem,
} from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceRequestItemProps {
  /** Current service request form item — controlled by ServiceRequestList. */
  item: ServiceRequestFormItem;
  /** Called when any field on this item changes. */
  onChange: (item: ServiceRequestFormItem) => void;
  /** Called when the doctor removes this item. */
  onRemove: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Card-based editor for a single FHIR ServiceRequest (lab order, imaging, etc.).
 *
 * @param item - Service request form item (AI-suggested + optional doctor edits).
 * @param onChange - Setter receiving the full updated item.
 * @param onRemove - Called when the doctor clicks the delete button.
 */
export function ServiceRequestItem({
  item,
  onChange,
  onRemove,
}: ServiceRequestItemProps) {
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

        {/* Status / Intent / Priority */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <ConceptSelect
              resource="ServiceRequest"
              field="status"
              value={item.status}
              onChange={(code) => onChange({ ...item, status: code })}
              placeholder="Status"
              fallback={SERVICE_REQUEST_STATUS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Intent</Label>
            <ConceptSelect
              resource="ServiceRequest"
              field="intent"
              value={item.intent}
              onChange={(code) => onChange({ ...item, intent: code })}
              placeholder="Intent"
              fallback={SERVICE_REQUEST_INTENT}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <ConceptSelect
              resource="ServiceRequest"
              field="priority"
              value={item.priority}
              onChange={(code) => onChange({ ...item, priority: code })}
              placeholder="Priority"
              fallback={SERVICE_REQUEST_PRIORITY}
            />
          </div>
        </div>

        {/* Category + Occurrence date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Category
              {item.fhirId && (
                <span className="ml-1 text-muted-foreground/60">(read-only)</span>
              )}
            </Label>
            <ConceptSelect
              resource="ServiceRequest"
              field="category"
              value={item.category}
              onChange={(code) => onChange({ ...item, category: code })}
              placeholder="Lab / Imaging…"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Occurrence Date</Label>
            {/* DateTimePicker renders the stored instant in local time. The old
                native input needed occurrenceDatetime.substring(0, 16) to be
                accepted at all, which silently discarded the timezone. */}
            <DateTimePicker
              value={item.occurrenceDatetime ?? ""}
              onChange={(value) =>
                onChange({ ...item, occurrenceDatetime: value || undefined })
              }
              placeholder="Pick date & time…"
              className="text-sm h-9"
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
            placeholder="e.g. Rule out infection"
            className="text-sm h-9"
          />
        </div>

        {/* Patient instructions */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Patient Instructions</Label>
          <Textarea
            value={item.patientInstruction ?? ""}
            onChange={(e) =>
              onChange({ ...item, patientInstruction: e.target.value || undefined })
            }
            placeholder="e.g. Fast for 8 hours before the test."
            className="text-sm resize-none"
            rows={2}
          />
        </div>

        {/* As Needed (PRN) */}
        <div className="flex items-center gap-2 pt-0.5">
          <Checkbox
            id={`as-needed-${item.id}`}
            checked={item.asNeeded ?? false}
            onCheckedChange={(checked) =>
              onChange({ ...item, asNeeded: checked === true })
            }
          />
          <Label
            htmlFor={`as-needed-${item.id}`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            As needed (PRN)
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
